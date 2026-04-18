from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import preprocess_image
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/preprocess")
async def preprocess(
    file: UploadFile = File(...),
    grayscale: bool = Form(True),
    thresholding: bool = Form(False),
    threshold_value: int = Form(140),
) -> dict:
    image = await read_upload_image(file)
    processed = preprocess_image(
        image=image,
        grayscale=grayscale,
        thresholding=thresholding,
        threshold_value=threshold_value,
    )

    return {
        "controls": {
            "grayscale": grayscale,
            "thresholding": thresholding,
            "threshold_value": threshold_value,
        },
        "image_base64": encode_image_base64(processed),
    }
