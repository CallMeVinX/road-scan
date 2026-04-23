from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse
import os

from app.services.cv_service import preprocess_image
from app.utils.image_io import encode_image_base64, infer_extension, read_upload_image

router = APIRouter()


@router.post("/metadata")
async def image_metadata(file: UploadFile = File(...)) -> dict:
    image = await read_upload_image(file)
    height, width = image.shape[:2]

    return {
        "filename": file.filename,
        "format": infer_extension(file.filename).upper(),
        "mime_type": file.content_type,
        "resolution": {
            "width": int(width),
            "height": int(height),
        },
        "channels": int(image.shape[2]) if image.ndim == 3 else 1,
    }


@router.post("/preprocess")
async def preprocess(
    file: UploadFile = File(...),
    grayscale: bool = Form(True),
    thresholding: bool = Form(False),
    threshold_value: int = Form(127),
) -> dict:
    image = await read_upload_image(file)
    processed = preprocess_image(image, grayscale, thresholding, threshold_value)
    
    return {
        "processed_base64": encode_image_base64(processed),
        "grayscale": grayscale,
        "thresholding": thresholding,
        "threshold_value": threshold_value,
    }


@router.get("/placeholders")
async def get_placeholder_images() -> dict:
    """Get list of available placeholder images"""
    placeholders_dir = "app/static/placeholders"
    
    if not os.path.exists(placeholders_dir):
        return {"placeholders": []}
    
    # Get all image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
    placeholders = []
    
    for filename in os.listdir(placeholders_dir):
        if os.path.isfile(os.path.join(placeholders_dir, filename)):
            _, ext = os.path.splitext(filename.lower())
            if ext in image_extensions:
                placeholders.append({
                    "filename": filename,
                    "name": os.path.splitext(filename)[0].replace('_', ' ').title(),
                    "url": f"/static/placeholders/{filename}"
                })
    
    # Sort by name
    placeholders.sort(key=lambda x: x["name"])
    
    return {"placeholders": placeholders}


@router.get("/placeholders/{filename}")
async def get_placeholder_image(filename: str):
    """Serve placeholder image file"""
    file_path = f"app/static/placeholders/{filename}"
    
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    
    return FileResponse(file_path, media_type='image/jpeg')
