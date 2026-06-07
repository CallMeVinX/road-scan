
from fastapi import APIRouter, File, UploadFile

from app.services.ml_service import (
    generate_gradcam,
    get_model_metrics,
    is_model_ready,
    load_models,
    predict_binary,
    predict_damage_type,
)
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/predict")
async def classify_road_damage(file: UploadFile = File(...)) -> dict:
    """
    Pipeline klasifikasi lengkap:

    1. Binary check: Apakah gambar ini menunjukkan jalan rusak?
    2. Jika rusak → multiclass: Jenis kerusakan apa?
    3. Grad-CAM: Di mana lokasi kerusakan pada gambar?

    Returns:
        {
          "model_ready": bool,
          "binary": { is_damaged, label, confidence_pct, all_probs },
          "damage_type": { predicted_class, confidence_pct, top3, all_probs } | null,
          "gradcam_base64": str | null,
          "summary": str  ← kalimat ringkasan untuk ditampilkan di UI
        }
    """
    if not is_model_ready():
        load_models()
    if not is_model_ready():
        return {
            "model_ready": False,
            "error": "Model belum siap. Jalankan training terlebih dahulu.",
            "binary": None,
            "damage_type": None,
            "gradcam_base64": None,
            "summary": "Model belum di-training.",
        }

    image = await read_upload_image(file)

    # ── Step 1: Binary classification ────────────────────────────────────────
    binary_result = predict_binary(image)

    if "error" in binary_result:
        return {
            "model_ready": True,
            "error": binary_result["error"],
            "binary": None,
            "damage_type": None,
            "gradcam_base64": None,
            "summary": "Terjadi error saat inferensi.",
        }

    # ── Step 2: Damage type classification (hanya jika rusak) ────────────────
    damage_result = None
    if binary_result.get("is_damaged", False):
        damage_result = predict_damage_type(image)

    # ── Step 3: Grad-CAM ─────────────────────────────────────────────────────
    gradcam_b64 = None
    use_binary  = not binary_result.get("is_damaged", True)
    gradcam_img = generate_gradcam(image, use_binary=use_binary)
    if gradcam_img is not None:
        gradcam_b64 = encode_image_base64(gradcam_img)

    # ── Step 4: Buat summary text ─────────────────────────────────────────────
    conf_pct = binary_result.get("confidence_pct", 0)
    if binary_result.get("is_damaged"):
        dmg_class = damage_result.get("predicted_class", "tidak diketahui") if damage_result else "tidak diketahui"
        dmg_conf  = damage_result.get("confidence_pct", 0) if damage_result else 0
        summary   = (
            f"Jalan terdeteksi RUSAK ({conf_pct:.1f}% confidence). "
            f"Jenis kerusakan: {dmg_class} ({dmg_conf:.1f}% confidence)."
        )
    else:
        summary = f"Jalan terdeteksi TIDAK RUSAK ({conf_pct:.1f}% confidence)."

    return {
        "model_ready":    True,
        "binary":         binary_result,
        "damage_type":    damage_result,
        "gradcam_base64": gradcam_b64,
        "summary":        summary,
    }


@router.get("/model-info")
async def get_model_info() -> dict:
    """
    Kembalikan metrics training untuk ditampilkan di Stage Model Performance:
    - val_accuracy binary & multiclass
    - confusion matrix (list of lists)
    - training history (loss & accuracy per epoch)
    - class names
    """
    if not is_model_ready():
        return {
            "model_ready": False,
            "message": "Model belum di-training. Jalankan backend/app/ml/training/train.py",
        }

    metrics = get_model_metrics()

    return {
        "model_ready": True,
        "multiclass":  metrics.get("multiclass", {}),
        "binary":      metrics.get("binary", {}),
    }


@router.get("/status")
async def model_status() -> dict:
    """Health-check endpoint untuk model."""
    metrics  = get_model_metrics()
    multi_acc = metrics.get("multiclass", {}).get("val_accuracy")
    bin_acc   = metrics.get("binary",     {}).get("val_accuracy")

    return {
        "model_ready":          is_model_ready(),
        "multiclass_accuracy":  f"{multi_acc:.2%}" if multi_acc else "N/A",
        "binary_accuracy":      f"{bin_acc:.2%}"   if bin_acc   else "N/A",
        "message": (
            "Model siap digunakan." if is_model_ready()
            else "Model belum di-load. Pastikan file .pt ada di backend/app/ml/saved_model/"
        ),
    }