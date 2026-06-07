"""
train.py — Road Damage Classifier (PyTorch)
=============================================
Kompatibel: Python 3.12, Windows x64

Install dependencies dulu:
    pip install torch torchvision scikit-learn seaborn matplotlib pillow

Struktur dataset:
    backend/app/ml/dataset/
    ├── Alligator Hole/   (20 gambar)
    ├── Longitudinal/     (20 gambar)
    ├── Pothole/          (20 gambar)
    ├── Transverse/       (20 gambar)
    └── Normal/           (opsional — gambar jalan mulus)

Jalankan dari folder backend/:
    python app/ml/training/train.py
"""

import os
import json
import shutil
import copy
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models
from sklearn.metrics import classification_report, confusion_matrix

# ── Config ────────────────────────────────────────────────────────────────────
SEED        = 42
IMG_SIZE    = 224
BATCH_SIZE  = 4
EPOCHS      = 50        # EarlyStopping akan berhenti lebih awal
LR_PHASE1   = 1e-3
LR_PHASE2   = 1e-5
PATIENCE    = 10
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

torch.manual_seed(SEED)
np.random.seed(SEED)

# ── Path ──────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(BASE_DIR)
DATASET_DIR = os.path.join(ML_DIR, "dataset")
OUTPUT_DIR  = os.path.join(ML_DIR, "saved_model")
BINARY_DIR  = os.path.join(ML_DIR, "dataset_binary")


os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Device: {DEVICE}")


# =============================================================================
# AUGMENTATION (memenuhi RTM 'pembobotan data')
# =============================================================================

TRAIN_TRANSFORMS = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(25),
    transforms.ColorJitter(brightness=0.4, contrast=0.3, saturation=0.3, hue=0.1),
    transforms.RandomAffine(degrees=0, shear=15, translate=(0.2, 0.2), scale=(0.8, 1.2)),
    transforms.ToTensor(),
    # Normalisasi ImageNet (memenuhi RTM 'normalisasi')
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

VAL_TRANSFORMS = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# =============================================================================
# BUILD MODEL MobileNetV2
# =============================================================================

def build_model(num_classes: int) -> nn.Module:
    """
    MobileNetV2 pretrained + custom head.

    Arsitektur head (memenuhi RTM pooling, regulasi, normalisasi):
        AdaptiveAvgPool2d  ← POOLING
        Flatten
        Linear(1280, 256)
        BatchNorm1d        ← NORMALISASI
        ReLU
        Dropout(0.5)       ← REGULASI
        Linear(256, 128)
        BatchNorm1d
        Dropout(0.3)
        Linear(128, num_classes)
    """
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)

    # Freeze semua layer backbone dulu
    for param in model.parameters():
        param.requires_grad = False

    # Ganti classifier head
    # MobileNetV2 sudah melakukan global average pooling di forward(),
    # sehingga classifier hanya memerlukan tensor [batch_size, in_features].
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 256),
        nn.LayerNorm(256),
        nn.ReLU(inplace=True),
        nn.Dropout(0.5),
        nn.Linear(256, 128),
        nn.LayerNorm(128),
        nn.ReLU(inplace=True),
        nn.Dropout(0.3),
        nn.Linear(128, num_classes),
    )

    return model.to(DEVICE)


# =============================================================================
# TRAINING LOOP
# =============================================================================

def train_one_epoch(model, loader, criterion, optimizer):
    model.train()
    total_loss, correct, total = 0.0, 0, 0

    for images, labels in loader:
        images, labels = images.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()

        outputs = model(images)
        loss    = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        preds       = outputs.argmax(dim=1)
        correct    += (preds == labels).sum().item()
        total      += images.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_preds, all_labels = [], []

    for images, labels in loader:
        images, labels = images.to(DEVICE), labels.to(DEVICE)
        outputs = model(images)
        loss    = criterion(outputs, labels)

        total_loss += loss.item() * images.size(0)
        preds       = outputs.argmax(dim=1)
        correct    += (preds == labels).sum().item()
        total      += images.size(0)

        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    return total_loss / total, correct / total, all_preds, all_labels


def train_model(dataset_path: str, model_name: str, output_path: str) -> dict:
    print(f"\n{'='*60}")
    print(f"  Training: {model_name.upper()}")
    print(f"{'='*60}")

    # Dataset
    full_dataset = datasets.ImageFolder(dataset_path, transform=TRAIN_TRANSFORMS)
    class_names  = full_dataset.classes
    n_total      = len(full_dataset)
    n_val        = max(1, int(n_total * 0.2))
    n_train      = n_total - n_val

    train_set, val_set = random_split(
        full_dataset, [n_train, n_val],
        generator=torch.Generator().manual_seed(SEED)
    )
    # Val set pakai transform tanpa augmentasi
    val_set.dataset = copy.deepcopy(full_dataset)
    val_set.dataset.transform = VAL_TRANSFORMS

    train_loader = DataLoader(train_set, batch_size=BATCH_SIZE, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_set,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    print(f"  Kelas  : {class_names}")
    print(f"  Train  : {n_train} | Val: {n_val}")

    model     = build_model(len(class_names))
    criterion = nn.CrossEntropyLoss()

    # ── Phase 1: Hanya train head (backbone frozen) ───────────────────────────
    print(f"\n  [Phase 1] Head only — backbone frozen")
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=LR_PHASE1)
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=5)

    best_val_acc  = 0.0
    best_weights  = copy.deepcopy(model.state_dict())
    no_improve    = 0
    history       = {"train_acc": [], "val_acc": [], "train_loss": [], "val_loss": []}
    phase1_len    = 0

    for epoch in range(EPOCHS):
        tr_loss, tr_acc = train_one_epoch(model, train_loader, criterion, optimizer)
        vl_loss, vl_acc, _, _ = evaluate(model, val_loader, criterion)
        scheduler.step(vl_acc)

        history["train_acc"].append(tr_acc)
        history["val_acc"].append(vl_acc)
        history["train_loss"].append(tr_loss)
        history["val_loss"].append(vl_loss)

        print(f"  Epoch {epoch+1:3d} | "
              f"train_acc={tr_acc:.3f} loss={tr_loss:.4f} | "
              f"val_acc={vl_acc:.3f} loss={vl_loss:.4f}")

        if vl_acc > best_val_acc:
            best_val_acc = vl_acc
            best_weights = copy.deepcopy(model.state_dict())
            no_improve   = 0
        else:
            no_improve += 1
            if no_improve >= PATIENCE:
                print(f"  EarlyStopping phase 1 di epoch {epoch+1}")
                break

    phase1_len = len(history["train_acc"])
    model.load_state_dict(best_weights)

    # ── Phase 2: Unfreeze 30 layer terakhir backbone ──────────────────────────
    print(f"\n  [Phase 2] Fine-tuning — unfreeze backbone akhir")
    layers_list = list(model.features.children())
    for layer in layers_list[-5:]:          # 5 blok terakhir MobileNetV2
        for param in layer.parameters():
            param.requires_grad = True

    optimizer = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR_PHASE2
    )
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=5)

    best_val_acc = 0.0
    no_improve   = 0

    for epoch in range(EPOCHS):
        tr_loss, tr_acc = train_one_epoch(model, train_loader, criterion, optimizer)
        vl_loss, vl_acc, _, _ = evaluate(model, val_loader, criterion)
        scheduler.step(vl_acc)

        history["train_acc"].append(tr_acc)
        history["val_acc"].append(vl_acc)
        history["train_loss"].append(tr_loss)
        history["val_loss"].append(vl_loss)

        print(f"  Epoch {epoch+1:3d} | "
              f"train_acc={tr_acc:.3f} loss={tr_loss:.4f} | "
              f"val_acc={vl_acc:.3f} loss={vl_loss:.4f}")

        if vl_acc > best_val_acc:
            best_val_acc = vl_acc
            best_weights = copy.deepcopy(model.state_dict())
            no_improve   = 0
        else:
            no_improve += 1
            if no_improve >= PATIENCE:
                print(f"  EarlyStopping phase 2 di epoch {epoch+1}")
                break

    model.load_state_dict(best_weights)

    # ── Simpan model ──────────────────────────────────────────────────────────
    torch.save({
        "model_state_dict": model.state_dict(),
        "class_names":      class_names,
        "num_classes":      len(class_names),
        "img_size":         IMG_SIZE,
    }, output_path)
    print(f"\n  ✓ Disimpan: {output_path}")

    # ── Evaluasi final ────────────────────────────────────────────────────────
    val_set.dataset.transform = VAL_TRANSFORMS
    _, final_acc, y_pred, y_true = evaluate(model, val_loader, criterion)

    report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
    cm     = confusion_matrix(y_true, y_pred).tolist()

    print("\n" + classification_report(y_true, y_pred, target_names=class_names))

    history["phase1_len"] = phase1_len

    return {
        "class_names":           class_names,
        "val_accuracy":          float(final_acc),
        "confusion_matrix":      cm,
        "classification_report": report,
        "training_history":      history,
    }


# =============================================================================
# BINARY DATASET PREPARATION
# =============================================================================

def prepare_binary_dataset():
    """Konversi 4 kelas → 2 kelas (rusak / tidak_rusak)."""
    if os.path.exists(BINARY_DIR):
        shutil.rmtree(BINARY_DIR)

    damage_classes = ["Alligator Hole", "Longitudinal", "Pothole", "Transverse"]
    has_normal     = os.path.isdir(os.path.join(DATASET_DIR, "Normal"))

    rusak_dir       = os.path.join(BINARY_DIR, "rusak")
    normal_dir      = os.path.join(BINARY_DIR, "tidak_rusak")
    os.makedirs(rusak_dir,  exist_ok=True)
    os.makedirs(normal_dir, exist_ok=True)

    count = 0
    for cls in damage_classes:
        src = os.path.join(DATASET_DIR, cls)
        if not os.path.isdir(src):
            continue
        for fname in os.listdir(src):
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                dst = f"{cls.replace(' ', '_')}_{fname}"
                shutil.copy2(os.path.join(src, fname), os.path.join(rusak_dir, dst))
                count += 1

    print(f"  Binary: {count} gambar rusak")

    if has_normal:
        src = os.path.join(DATASET_DIR, "Normal")
        for fname in os.listdir(src):
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                shutil.copy2(os.path.join(src, fname), os.path.join(normal_dir, fname))
        print(f"  Binary: folder Normal digunakan sebagai tidak_rusak")
    else:
        # Pseudo-normal: blur kuat gambar rusak
        from PIL import Image, ImageFilter
        all_imgs = [f for f in os.listdir(rusak_dir)
                    if f.lower().endswith((".jpg",".jpeg",".png"))]
        for fname in all_imgs:
            img = Image.open(os.path.join(rusak_dir, fname)).convert("RGB")
            blurred = img.filter(ImageFilter.GaussianBlur(radius=12))
            blurred.save(os.path.join(normal_dir, f"pseudo_{fname}"))
        print(f"  Binary: {len(all_imgs)} pseudo-normal dibuat dari blur")
        print("  ⚠ Tambahkan folder dataset/Normal/ untuk hasil lebih baik!")


# =============================================================================
# PLOT HELPER
# =============================================================================

def save_plots(history: dict, cm: list, class_names: list, prefix: str):
    p1     = history.get("phase1_len", len(history["train_acc"]) // 2)
    epochs = range(1, len(history["train_acc"]) + 1)

    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    for ax, (tr_key, vl_key), title in zip(
        axes,
        [("train_acc","val_acc"), ("train_loss","val_loss")],
        ["Accuracy", "Loss"]
    ):
        ax.plot(epochs, history[tr_key], label="Train", color="#3B8BD4")
        ax.plot(epochs, history[vl_key], label="Val",   color="#E85D24", linestyle="--")
        ax.axvline(x=p1, color="gray", linestyle=":", alpha=0.6, label="Fine-tune start")
        ax.set_title(f"{prefix} — {title}")
        ax.set_xlabel("Epoch")
        ax.legend()
        ax.grid(alpha=0.3)

    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, f"{prefix}_training_curve.png")
    plt.savefig(out, dpi=150)
    plt.close()

    # Confusion matrix
    cm_arr = np.array(cm)
    fig, ax = plt.subplots(figsize=(max(5, len(class_names)+1), max(4, len(class_names))))
    sns.heatmap(cm_arr, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"{prefix} — Confusion Matrix")
    plt.tight_layout()
    out_cm = os.path.join(OUTPUT_DIR, f"{prefix}_confusion_matrix.png")
    plt.savefig(out_cm, dpi=150)
    plt.close()
    print(f"  ✓ Plot: {prefix}_training_curve.png, {prefix}_confusion_matrix.png")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  ROAD DAMAGE — PYTORCH TRAINING PIPELINE")
    print("="*60)
    print(f"  Dataset : {DATASET_DIR}")
    print(f"  Output  : {OUTPUT_DIR}")
    print(f"  Device  : {DEVICE}")

    if not os.path.isdir(DATASET_DIR):
        print(f"\n❌ Folder dataset tidak ditemukan: {DATASET_DIR}")
        exit(1)

    found = [d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))]
    print(f"  Kelas   : {found}")

    # 1. Multiclass
    multi_path    = os.path.join(OUTPUT_DIR, "multiclass_classifier.pt")
    multi_metrics = train_model(DATASET_DIR, "multiclass", multi_path)
    save_plots(multi_metrics["training_history"],
               multi_metrics["confusion_matrix"],
               multi_metrics["class_names"], "multiclass")

    # 2. Binary
    print("\n[Binary] Menyiapkan dataset...")
    prepare_binary_dataset()
    binary_path    = os.path.join(OUTPUT_DIR, "binary_classifier.pt")
    binary_metrics = train_model(BINARY_DIR, "binary", binary_path)
    save_plots(binary_metrics["training_history"],
               binary_metrics["confusion_matrix"],
               binary_metrics["class_names"], "binary")

    # 3. Simpan metrics.json
    all_metrics = {
        "multiclass": {k: v for k, v in multi_metrics.items()},
        "binary":     {k: v for k, v in binary_metrics.items()},
    }
    with open(os.path.join(OUTPUT_DIR, "metrics.json"), "w") as f:
        json.dump(all_metrics, f, indent=2)

    shutil.rmtree(BINARY_DIR, ignore_errors=True)

    print("\n" + "="*60)
    print("  SELESAI")
    print("="*60)
    print(f"  Multiclass val_accuracy : {multi_metrics['val_accuracy']:.2%}")
    print(f"  Binary     val_accuracy : {binary_metrics['val_accuracy']:.2%}")
    print(f"\n  Output di: {OUTPUT_DIR}")
    print(f"  ├── multiclass_classifier.pt")
    print(f"  ├── binary_classifier.pt")
    print(f"  ├── metrics.json")
    print(f"  ├── multiclass_training_curve.png")
    print(f"  ├── multiclass_confusion_matrix.png")
    print(f"  ├── binary_training_curve.png")
    print(f"  └── binary_confusion_matrix.png")