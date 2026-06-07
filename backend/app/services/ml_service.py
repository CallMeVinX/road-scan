"""
ml_service.py — Inference Service (PyTorch)
=============================================
Diletakkan di: backend/app/services/ml_service.py
"""

import os
import json
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# ── Path ─────────────────────────────────────────────────────────────────────
_ML_DIR       = os.path.join(os.path.dirname(__file__), "..", "ml", "saved_model")
_BINARY_PATH  = os.path.join(_ML_DIR, "binary_classifier.pt")
_MULTI_PATH   = os.path.join(_ML_DIR, "multiclass_classifier.pt")
_METRICS_PATH = os.path.join(_ML_DIR, "metrics.json")

IMG_SIZE = 224
DEVICE   = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── State global ──────────────────────────────────────────────────────────────
_binary_model    = None
_multi_model     = None
_binary_classes  = []
_multi_classes   = []
_metrics_cache   = None
_models_loaded   = False

# ── Transform (sama dengan VAL_TRANSFORMS di training) ───────────────────────
_TRANSFORM = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# =============================================================================
# BUILD MODEL (harus sama arsitekturnya dengan train.py)
# =============================================================================

def _build_mobilenetv2(num_classes: int) -> nn.Module:
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.AdaptiveAvgPool2d((1, 1)),
        nn.Flatten(),
        nn.Linear(in_features, 256),
        nn.BatchNorm1d(256),
        nn.ReLU(inplace=True),
        nn.Dropout(0.5),
        nn.Linear(256, 128),
        nn.BatchNorm1d(128),
        nn.ReLU(inplace=True),
        nn.Dropout(0.3),
        nn.Linear(128, num_classes),
    )
    return model


# =============================================================================
# LOAD MODELS
# =============================================================================

def load_models() -> bool:
    global _binary_model, _multi_model, _binary_classes, _multi_classes, _models_loaded

    if _models_loaded:
        return True

    try:
        if not os.path.exists(_BINARY_PATH) or not os.path.exists(_MULTI_PATH):
            print("[ML] ⚠ File .pt belum ada. Jalankan training dulu.")
            return False

        # Load binary
        ckpt_b         = torch.load(_BINARY_PATH, map_location=DEVICE)
        _binary_classes = ckpt_b["class_names"]
        _binary_model  = _build_mobilenetv2(ckpt_b["num_classes"])
        _binary_model.load_state_dict(ckpt_b["model_state_dict"])
        _binary_model.to(DEVICE).eval()

        # Load multiclass
        ckpt_m         = torch.load(_MULTI_PATH, map_location=DEVICE)
        _multi_classes = ckpt_m["class_names"]
        _multi_model   = _build_mobilenetv2(ckpt_m["num_classes"])
        _multi_model.load_state_dict(ckpt_m["model_state_dict"])
        _multi_model.to(DEVICE).eval()

        _models_loaded = True
        print(f"[ML] ✓ Model loaded — device: {DEVICE}")
        print(f"[ML]   Binary classes   : {_binary_classes}")
        print(f"[ML]   Multiclass classes: {_multi_classes}")
        return True

    except Exception as e:
        print(f"[ML] ❌ Gagal load: {e}")
        return False


# =============================================================================
# PREPROCESS
# =============================================================================

def _preprocess(image: np.ndarray) -> torch.Tensor:
    """BGR numpy → normalized tensor (1, 3, 224, 224)"""
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    return _TRANSFORM(pil).unsqueeze(0).to(DEVICE)


# =============================================================================
# PREDICT BINARY
# =============================================================================

def predict_binary(image: np.ndarray) -> dict:
    if not _models_loaded:
        return {"error": "Model belum di-load."}
    try:
        tensor = _preprocess(image)
        with torch.no_grad():
            logits = _binary_model(tensor)
            probs  = torch.softmax(logits, dim=1)[0].cpu().numpy()

        pred_idx   = int(np.argmax(probs))
        pred_label = _binary_classes[pred_idx]
        confidence = float(probs[pred_idx])

        return {
            "is_damaged":     pred_label == "rusak",
            "label":          pred_label,
            "confidence":     confidence,
            "confidence_pct": round(confidence * 100, 2),
            "all_probs":      {c: float(p) for c, p in zip(_binary_classes, probs)},
        }
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# PREDICT DAMAGE TYPE
# =============================================================================

def predict_damage_type(image: np.ndarray) -> dict:
    if not _models_loaded:
        return {"error": "Model belum di-load."}
    try:
        tensor = _preprocess(image)
        with torch.no_grad():
            logits = _multi_model(tensor)
            probs  = torch.softmax(logits, dim=1)[0].cpu().numpy()

        pred_idx   = int(np.argmax(probs))
        pred_label = _multi_classes[pred_idx]
        confidence = float(probs[pred_idx])

        sorted_idx = np.argsort(probs)[::-1]
        top3 = [
            {"class": _multi_classes[i], "confidence_pct": round(float(probs[i]) * 100, 2)}
            for i in sorted_idx[:3]
        ]

        return {
            "predicted_class": pred_label,
            "confidence":      confidence,
            "confidence_pct":  round(confidence * 100, 2),
            "all_probs":       {c: float(p) for c, p in zip(_multi_classes, probs)},
            "top3":            top3,
        }
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# GRAD-CAM (PyTorch hook-based)
# =============================================================================

def generate_gradcam(image: np.ndarray, use_binary: bool = False) -> Optional[np.ndarray]:
    """
    Grad-CAM menggunakan forward/backward hook pada layer konvolusi
    terakhir MobileNetV2 features.

    Returns overlay BGR image atau None jika gagal.
    """
    model = _binary_model if use_binary else _multi_model
    if model is None:
        return None

    try:
        tensor = _preprocess(image)  # (1, 3, 224, 224)

        # Ambil layer konvolusi terakhir dari features MobileNetV2
        # Index -1 di features adalah layer terakhir sebelum classifier
        target_layer = model.features[-1]

        gradients  = []
        activations = []

        def save_gradient(grad):
            gradients.append(grad)

        def forward_hook(module, input, output):
            activations.append(output)
            output.register_hook(save_gradient)

        handle = target_layer.register_forward_hook(forward_hook)

        # Forward pass
        model.zero_grad()
        output = model(tensor)
        pred_class = output.argmax(dim=1).item()

        # Backward pass untuk kelas prediksi
        output[0, pred_class].backward()

        handle.remove()

        if not gradients or not activations:
            return None

        # Hitung Grad-CAM
        grads_val = gradients[0][0]          # (C, H, W)
        acts_val  = activations[0][0]        # (C, H, W)

        weights = grads_val.mean(dim=(1, 2))  # GAP gradient → (C,)

        cam = torch.zeros(acts_val.shape[1:], device=DEVICE)
        for i, w in enumerate(weights):
            cam += w * acts_val[i]

        cam = torch.relu(cam)
        cam = cam.detach().cpu().numpy()

        if cam.max() > 0:
            cam = cam / cam.max()

        # Resize ke ukuran gambar asli
        h, w_img = image.shape[:2]
        cam_resized = cv2.resize(cam, (w_img, h))
        heatmap     = cv2.applyColorMap(
            (cam_resized * 255).astype(np.uint8),
            cv2.COLORMAP_JET
        )

        overlay = cv2.addWeighted(image, 0.6, heatmap, 0.4, 0)
        return overlay

    except Exception as e:
        print(f"[ML] Grad-CAM error: {e}")
        return None


# =============================================================================
# UTILS
# =============================================================================

def get_model_metrics() -> dict:
    global _metrics_cache
    if _metrics_cache is not None:
        return _metrics_cache
    try:
        if os.path.exists(_METRICS_PATH):
            with open(_METRICS_PATH) as f:
                _metrics_cache = json.load(f)
            return _metrics_cache
    except Exception as e:
        print(f"[ML] Gagal baca metrics: {e}")
    return {}


def is_model_ready() -> bool:
    return _models_loaded and _binary_model is not None and _multi_model is not None