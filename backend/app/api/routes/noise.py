from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import (
    add_salt_pepper_noise,
    add_gaussian_noise,
    remove_noise_bilateral,
    remove_noise_morphology,
)
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/add-salt-pepper")
async def add_salt_pepper(
    file: UploadFile = File(...),
    probability: float = Form(0.01),
) -> dict:
    """
    Tambahkan Salt & Pepper Noise ke citra.
    
    Salt & Pepper Noise:
    - Random piksel berubah menjadi putih (255) atau hitam (0)
    - Umum terjadi pada gambar yang dikompres atau capture dengan kondisi buruk
    - Sangat berguna untuk mendemonstrasikan pemahaman bentuk noise (sub-CPMK requirement)
    
    Args:
        file: Image file
        probability: Probabilitas piksel terkena noise (0.0 - 0.5, default 0.01 = 1%)
    
    Returns:
        JSON dengan noisy image dan statistik noise yang diterapkan
    """
    prob = max(0.0, min(probability, 0.5))
    
    image = await read_upload_image(file)
    noisy, stats = add_salt_pepper_noise(image, prob)
    
    return {
        "noise_type": "salt_pepper",
        "noisy_image_base64": encode_image_base64(noisy),
        "noise_stats": stats,
    }


@router.post("/add-gaussian")
async def add_gaussian(
    file: UploadFile = File(...),
    std_dev: float = Form(25.0),
) -> dict:
    """
    Tambahkan Gaussian Noise ke citra.
    
    Gaussian Noise:
    - Random nilai noise mengikuti distribusi normal (Gaussian)
    - Umum pada foto dengan ISO tinggi atau sensor dengan gain tinggi
    - Mendemonstrasikan pemahaman distribusi noise (sub-CPMK requirement)
    
    Args:
        file: Image file
        std_dev: Standard deviation dari noise (0-100, default 25)
    
    Returns:
        JSON dengan noisy image, SNR, dan noise statistics
    """
    std = max(0.0, min(std_dev, 100.0))
    
    image = await read_upload_image(file)
    noisy, stats = add_gaussian_noise(image, std)
    
    return {
        "noise_type": "gaussian",
        "noisy_image_base64": encode_image_base64(noisy),
        "noise_stats": stats,
    }


@router.post("/remove-bilateral")
async def remove_bilateral(
    file: UploadFile = File(...),
    diameter: int = Form(9),
    sigma_color: float = Form(75.0),
    sigma_space: float = Form(75.0),
) -> dict:
    """
    Hilangkan noise menggunakan Bilateral Filter.
    
    Bilateral Filter:
    - Sangat efektif menghilangkan noise sambil mempertahankan edges
    - Edge-preserving smooth filter
    - Cocok untuk pavement damage karena edge retakan tetap tajam
    
    Args:
        file: Image file (preferably with noise)
        diameter: Diameter neighborhood pixel (3-25, default 9)
        sigma_color: Sigma untuk domain warna (default 75)
        sigma_space: Sigma untuk domain spasial (default 75)
    
    Returns:
        JSON dengan denoised image dan filter statistics
    """
    image = await read_upload_image(file)
    denoised, stats = remove_noise_bilateral(image, diameter, sigma_color, sigma_space)
    
    return {
        "filter_type": "bilateral",
        "denoised_image_base64": encode_image_base64(denoised),
        "filter_stats": stats,
    }


@router.post("/remove-morphology")
async def remove_morphology(
    file: UploadFile = File(...),
    kernel_size: int = Form(5),
) -> dict:
    """
    Hilangkan noise menggunakan Morphological Operations (opening).
    
    Morphological Opening:
    - Erosion followed by dilation
    - Efektif menghilangkan small noise sambil mempertahankan struktur utama
    - Berguna untuk menghilangkan salt & pepper noise
    
    Args:
        file: Image file (preferably with noise)
        kernel_size: Ukuran kernel morfologi (3-21, default 5)
    
    Returns:
        JSON dengan denoised image dan filter statistics
    """
    image = await read_upload_image(file)
    denoised, stats = remove_noise_morphology(image, kernel_size)
    
    return {
        "filter_type": "morphological_opening",
        "denoised_image_base64": encode_image_base64(denoised),
        "filter_stats": stats,
    }


@router.post("/compare")
async def compare_noise_removal(
    file: UploadFile = File(...),
    noise_type: str = Form("salt_pepper"),
    noise_intensity: float = Form(0.05),
) -> dict:
    """
    Bandingkan berbagai metode penghilangan noise.
    
    Endpoint ini membantu:
    1. Mendemonstrasikan pemahaman berbagai noise types
    2. Membandingkan efektivitas berbagai filter techniques
    3. Menunjukkan trade-off antara smoothing vs edge preservation
    
    Args:
        file: Original image
        noise_type: "salt_pepper" atau "gaussian"
        noise_intensity: Intensitas noise (0.0 - 1.0)
    
    Returns:
        JSON dengan:
        - Noisy image
        - Hasil bilateral filter
        - Hasil morphological filter
        - Analisis perbandingan
    """
    image = await read_upload_image(file)
    
    # Add noise
    if noise_type == "salt_pepper":
        noisy, noise_stats = add_salt_pepper_noise(image, min(noise_intensity, 0.3))
    else:  # gaussian
        noisy, noise_stats = add_gaussian_noise(image, noise_intensity * 100)
    
    # Remove noise dengan berbagai metode
    denoised_bilateral, stats_bilateral = remove_noise_bilateral(noisy)
    denoised_morphology, stats_morphology = remove_noise_morphology(noisy)
    
    return {
        "noise_type": noise_type,
        "noise_stats": noise_stats,
        "results": {
            "noisy_image_base64": encode_image_base64(noisy),
            "bilateral_filtered_base64": encode_image_base64(denoised_bilateral),
            "morphology_filtered_base64": encode_image_base64(denoised_morphology),
        },
        "filter_comparison": {
            "bilateral_stats": stats_bilateral,
            "morphology_stats": stats_morphology,
        },
    }
