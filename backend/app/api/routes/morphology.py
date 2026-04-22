from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import morphology_transform
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()

@router.post("/transform")
async def morphology(
    file: UploadFile = File(...),
    operation: str = Form("dilation"),
    iterations: int = Form(1),
    kernel_size: int = Form(3), # TAMBAHKAN PENERIMA DATA INI
) -> dict:
    op = operation.lower()
    if op not in {"dilation", "erosion"}:
        op = "dilation"

    # Pastikan ukuran kernel selalu angka ganjil (1, 3, 5, 7...)
    k_size = kernel_size if kernel_size % 2 != 0 else kernel_size + 1

    transformed_mask, overlay = morphology_transform(
        image=await read_upload_image(file),
        operation=op,
        iterations=max(1, min(iterations, 5)),
        kernel_size=max(1, min(k_size, 31)), # BATASI MAKSIMAL 31x31
    )

    return {
        "operation": op,
        "iterations": max(1, min(iterations, 5)),
        "kernel_size": k_size,
        "mask_base64": encode_image_base64(transformed_mask),
        "overlay_base64": encode_image_base64(overlay),
    }