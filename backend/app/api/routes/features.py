from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import harris_corners
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/harris")
async def feature_detection_harris(
    file: UploadFile = File(...),
    threshold_ratio: float = Form(0.01),
    max_points: int = Form(250),
) -> dict:
    image = await read_upload_image(file)
    overlay, points, all_detected = harris_corners(
        image=image,
        threshold_ratio=max(0.001, min(threshold_ratio, 0.2)),
        max_points=max(10, min(max_points, 5000)),
    )

    return {
        "detected_total": all_detected,
        "returned_points": len(points),
        "points": points,
        "overlay_base64": encode_image_base64(overlay),
    }
