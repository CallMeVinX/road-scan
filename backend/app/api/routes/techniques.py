from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from app.services import cv_service
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()

@router.post("/apply")
async def apply_technique(
    file: UploadFile = File(...),
    method: str = Form(...)
) -> dict:
    # 1. Validasi dan decode file menggunakan fungsi utilitas bawaan Anda
    try:
        image = await read_upload_image(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Eksekusi teknik pemrosesan berdasarkan parameter 'method'
    processed_image = None
    
    if method == "threshold":
        processed_image = cv_service.apply_binary_threshold(image)
    elif method == "adaptive":
        processed_image = cv_service.apply_adaptive_threshold(image)
    elif method == "blur":
        processed_image = cv_service.apply_gaussian_blur(image)
    else:
        raise HTTPException(status_code=400, detail=f"Teknik '{method}' tidak dikenal")

    # 3. Encode kembali ke Base64 untuk dikirim ke Frontend menggunakan fungsi utilitas Anda
    try:
        base64_str = encode_image_base64(processed_image)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Gagal melakukan encode gambar hasil")

    return {
        "status": "success",
        "method": method,
        "image_base64": base64_str
    }

# (Opsional) Biarkan route /preprocess bawaan Anda tetap ada di bawah sini jika masih digunakan di stage lain
@router.post("/preprocess")
async def preprocess(
    file: UploadFile = File(...),
    grayscale: bool = Form(True),
    thresholding: bool = Form(False),
    threshold_value: int = Form(140),
) -> dict:
    image = await read_upload_image(file)
    # Sesuaikan pemanggilan ke cv_service jika Anda masih menggunakan rute ini
    processed = cv_service.preprocess_image(
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