from fastapi import APIRouter, File, UploadFile

from app.services.cv_service import edge_detection_3x3
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/edge-detection")
async def convolution_edge_detection(file: UploadFile = File(...)) -> dict:
    image = await read_upload_image(file)
    edges, kernel, stats = edge_detection_3x3(image)

    return {
        "kernel": kernel,
        "response_stats": stats,
        "image_base64": encode_image_base64(edges),
    }
