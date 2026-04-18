import base64
from pathlib import Path

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile


async def read_upload_image(file: UploadFile) -> np.ndarray:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file upload")

    np_buffer = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    return image


def encode_image_base64(image: np.ndarray, extension: str = ".png") -> str:
    success, encoded = cv2.imencode(extension, image)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode image")

    return base64.b64encode(encoded.tobytes()).decode("utf-8")


def infer_extension(filename: str | None) -> str:
    if not filename:
        return "png"

    suffix = Path(filename).suffix.lower().replace(".", "")
    return suffix or "png"
