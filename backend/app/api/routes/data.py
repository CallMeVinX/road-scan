from fastapi import APIRouter, File, UploadFile

from app.utils.image_io import infer_extension, read_upload_image

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
