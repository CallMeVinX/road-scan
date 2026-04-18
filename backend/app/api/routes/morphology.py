from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import morphology_transform
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/transform")
async def morphology(
    file: UploadFile = File(...),
    operation: str = Form("dilation"),
    iterations: int = Form(1),
) -> dict:
    op = operation.lower()
    if op not in {"dilation", "erosion"}:
        op = "dilation"

    transformed_mask, overlay = morphology_transform(
        image=await read_upload_image(file),
        operation=op,
        iterations=max(1, min(iterations, 5)),
    )

    return {
        "operation": op,
        "iterations": max(1, min(iterations, 5)),
        "mask_base64": encode_image_base64(transformed_mask),
        "overlay_base64": encode_image_base64(overlay),
    }
