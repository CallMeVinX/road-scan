from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import quantize_image, get_quantization_levels
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/reduce")
async def reduce_color_depth(
    file: UploadFile = File(...),
    bits_per_channel: int = Form(4),
) -> dict:
    """
    Kuantisasi citra: Mengurangi kedalaman bit per channel warna.
    
    Contoh use case:
    - bits_per_channel=8: 24-bit RGB (standar, 16.7 juta warna)
    - bits_per_channel=4: 12-bit RGB (4096 warna)
    - bits_per_channel=2: 6-bit RGB (64 warna)
    - bits_per_channel=1: 3-bit RGB (8 warna - hitam putih)
    
    Cuztomizing bits_per_channel membantu:
    1. Demonstrasi pemahaman kuantisasi (RTM requirement)
    2. Analisis kerusakan dengan resolusi warna yang berbeda
    3. Kompresi citra untuk transmisi bandwidth rendah
    
    Args:
        file: Image file (PNG, JPG, BMP, etc)
        bits_per_channel: Target bit depth per channel (1-8)
    
    Returns:
        JSON dengan:
        - quantized_base64: Citra ter-kuantisasi dalam base64
        - original_stats: Statistik gambar asli
        - quantized_stats: Statistik setelah kuantisasi
        - compression_ratio: Rasio kompresi
    """
    bits = max(1, min(bits_per_channel, 8))
    
    image = await read_upload_image(file)
    
    # Get original stats
    original_stats = get_quantization_levels(image)
    
    # Apply quantization
    quantized, quant_stats = quantize_image(image, bits)
    
    return {
        "bits_per_channel": bits,
        "quantized_base64": encode_image_base64(quantized),
        "original_stats": original_stats,
        "quantization_stats": quant_stats,
    }


@router.post("/levels")
async def analyze_color_levels(file: UploadFile = File(...)) -> dict:
    """
    Analisis histogram dan kedalaman warna dari citra.
    
    Endpoint ini membantu mendemonstrasikan:
    1. Pemahaman tentang representasi warna (RGB channels)
    2. Distribusi warna dalam citra pavement
    3. Dasar teori untuk kuantisasi
    
    Returns:
        JSON dengan histogram dan statistik warna
    """
    image = await read_upload_image(file)
    stats = get_quantization_levels(image)
    
    return {
        "color_analysis": stats,
        "description": "Analisis histogram per channel (Blue, Green, Red) dan statistik kedalaman warna",
    }
