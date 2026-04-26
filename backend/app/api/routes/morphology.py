from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import morphology_transform
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()

# Himpunan operasi morfologi yang didukung
VALID_OPERATIONS = {"dilation", "erosion", "opening", "closing"}


@router.post("/transform")
async def morphology(
    file: UploadFile = File(...),
    operation: str = Form("dilation"),
    iterations: int = Form(1),
    kernel_size: int = Form(3),
) -> dict:
    """
    Endpoint transformasi morfologi.

    Parameters
    ----------
    file        : Gambar yang diunggah pengguna (multipart).
    operation   : 'dilation' | 'erosion' | 'opening' | 'closing'. Default: 'dilation'.
    iterations  : Jumlah iterasi operasi, dibatasi antara 1–5. Default: 1.
    kernel_size : Ukuran structuring element (piksel). Harus ganjil, max 31. Default: 3.

    Returns
    -------
    JSON dengan field:
        operation      – nama operasi yang dieksekusi
        iterations     – iterasi setelah sanitasi
        kernel_size    – ukuran kernel setelah sanitasi
        mask_base64    – hasil mask morfologi (PNG → base64)
        overlay_base64 – overlay visualisasi (PNG → base64)
    """
    # --- Validasi & sanitasi operation ---
    op = operation.strip().lower()
    if op not in VALID_OPERATIONS:
        op = "dilation"

    # --- Sanitasi iterations: klem ke rentang [1, 5] ---
    safe_iterations = max(1, min(iterations, 5))

    # --- Sanitasi kernel_size: pastikan ganjil, klem ke [1, 31] ---
    k = kernel_size if kernel_size % 2 != 0 else kernel_size + 1
    safe_kernel = max(1, min(k, 31))

    # --- Jalankan transformasi ---
    transformed_mask, overlay = morphology_transform(
        image=await read_upload_image(file),
        operation=op,
        iterations=safe_iterations,
        kernel_size=safe_kernel,
    )

    return {
        "operation": op,
        "iterations": safe_iterations,
        "kernel_size": safe_kernel,
        "mask_base64": encode_image_base64(transformed_mask),
        "overlay_base64": encode_image_base64(overlay),
    }
