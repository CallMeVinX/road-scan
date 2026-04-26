from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import (
    add_salt_pepper_noise,
    add_gaussian_noise,
    remove_noise_bilateral,
    remove_noise_morphology,
    remove_noise_median,
)
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()

@router.post("/add-salt-pepper")
async def add_salt_pepper(file: UploadFile = File(...), probability: float = Form(0.01)) -> dict:
    prob = max(0.0, min(probability, 0.5))
    image = await read_upload_image(file)
    noisy, stats = add_salt_pepper_noise(image, prob)
    return {"noise_type": "salt_pepper", "noisy_image_base64": encode_image_base64(noisy), "noise_stats": stats}

@router.post("/add-gaussian")
async def add_gaussian(file: UploadFile = File(...), std_dev: float = Form(25.0)) -> dict:
    std = max(0.0, min(std_dev, 100.0))
    image = await read_upload_image(file)
    noisy, stats = add_gaussian_noise(image, std)
    return {"noise_type": "gaussian", "noisy_image_base64": encode_image_base64(noisy), "noise_stats": stats}

@router.post("/remove-bilateral")
async def remove_bilateral(
    file: UploadFile = File(...), diameter: int = Form(9), sigma_color: float = Form(75.0), sigma_space: float = Form(75.0)
) -> dict:
    image = await read_upload_image(file)
    denoised, stats = remove_noise_bilateral(image, diameter, sigma_color, sigma_space)
    return {"filter_type": "bilateral", "denoised_image_base64": encode_image_base64(denoised), "filter_stats": stats}

@router.post("/remove-morphology")
async def remove_morphology(file: UploadFile = File(...), kernel_size: int = Form(5)) -> dict:
    image = await read_upload_image(file)
    denoised, stats = remove_noise_morphology(image, kernel_size)
    return {"filter_type": "morphological_opening", "denoised_image_base64": encode_image_base64(denoised), "filter_stats": stats}

@router.post("/remove-median")
async def remove_median(file: UploadFile = File(...), kernel_size: int = Form(5)) -> dict:
    image = await read_upload_image(file)
    denoised, stats = remove_noise_median(image, kernel_size)
    return {"filter_type": "median", "denoised_image_base64": encode_image_base64(denoised), "filter_stats": stats}

# HANYA ADA SATU ENDPOINT COMPARE DI SINI
@router.post("/compare")
async def compare_noise_removal(
    file: UploadFile = File(...),
    noise_type: str = Form("salt_pepper"),
    noise_intensity: float = Form(0.05),
) -> dict:
    image = await read_upload_image(file)
    
    if noise_type == "salt_pepper":
        noisy, noise_stats = add_salt_pepper_noise(image, min(noise_intensity, 0.3))
    else:  
        noisy, noise_stats = add_gaussian_noise(image, noise_intensity * 100)
    
    # 3 Metode berjalan secara paralel
    denoised_bilateral, stats_bilateral = remove_noise_bilateral(noisy)
    denoised_morphology, stats_morphology = remove_noise_morphology(noisy)
    denoised_median, stats_median = remove_noise_median(noisy) 
    
    return {
        "noise_type": noise_type,
        "noise_stats": noise_stats,
        "results": {
            "noisy_image_base64": encode_image_base64(noisy),
            "bilateral_filtered_base64": encode_image_base64(denoised_bilateral),
            "morphology_filtered_base64": encode_image_base64(denoised_morphology),
            "median_filtered_base64": encode_image_base64(denoised_median),
        },
        "filter_comparison": {
            "bilateral_stats": stats_bilateral,
            "morphology_stats": stats_morphology,
            "median_stats": stats_median,
        },
    }