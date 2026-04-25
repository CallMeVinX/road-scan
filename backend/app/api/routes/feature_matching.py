from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import feature_matching_sift, feature_matching_template
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/sift")
async def matching_sift(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
    max_matches: int = Form(20),
) -> dict:
    """
    Deteksi dan cocokkan fitur SIFT antara dua gambar.
    
    SIFT (Scale-Invariant Feature Transform):
    - Invariant terhadap scale, rotation, dan perspective change
    - Sangat kuat untuk matching pavement damage across berbagai sudut
    - Memenuhi silabus "Feature Detection and Matching" (kekurangan #3)
    
    Use case:
    1. Mencocokkan retakan yang sama dari berbagai perspektif
    2. Verifikasi bahwa damage yang sama terdeteksi di lokasi berbeda
    3. Tracking damage terhadap waktu (historical comparison)
    
    Args:
        image1: Query image (gambar yang dicari di image2)
        image2: Reference image (gambar yang menjadi referensi)
        max_matches: Maximum matches to return (default 20)
    
    Returns:
        JSON dengan:
        - matched_points: Jumlah fitur yang berhasil dicocokkan
        - keypoints_image1/2: Jumlah keypoint terdeteksi per gambar
        - match_details: Detail setiap match (distance, coordinates)
        - visualization_base64: Gambar hasil matching dengan garis penghubung
    """
    img1 = await read_upload_image(image1)
    img2 = await read_upload_image(image2)
    
    result = feature_matching_sift(img1, img2, max_matches)
    
    return {
        "method": "SIFT",
        "description": "Scale-Invariant Feature Transform - robust matching untuk berbagai kondisi",
        **result,
    }


@router.post("/template")
async def matching_template(
    template: UploadFile = File(...),
    image: UploadFile = File(...),
) -> dict:
    """
    Template Matching: Cari posisi template dalam gambar yang lebih besar.
    
    Template Matching:
    - Cocok untuk mendeteksi pola retakan yang sama di berbagai lokasi
    - Multi-scale matching untuk handle berbagai ukuran damage
    - Lebih cepat dari SIFT untuk pattern yang jelas
    
    Use case:
    1. Menemukan jenis retakan tertentu di berbagai bagian jalan
    2. Mendeteksi pola kerusakan yang recurring
    3. Quality control untuk inspeksi jalan (bandingkan dengan template damage)
    
    Args:
        template: Template image (gambar kerusakan referensi, ukuran lebih kecil)
        image: Target image untuk dicari (gambar jalan lengkap)
    
    Returns:
        JSON dengan:
        - matched_locations: List koordinat dan confidence score
        - total_matches: Jumlah match yang ditemukan
        - visualization_base64: Gambar dengan bounding box di setiap match
    """
    template_img = await read_upload_image(template)
    target_img = await read_upload_image(image)
    
    result = feature_matching_template(template_img, target_img)
    
    return {
        "method": "Template_Matching",
        "description": "Multi-scale template matching untuk deteksi pola recurring",
        **result,
    }


@router.post("/compare-methods")
async def compare_matching_methods(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
) -> dict:
    """
    Bandingkan dua metode feature matching (SIFT vs Template).
    
    Endpoint ini membantu:
    1. Mendemonstrasikan pemahaman berbagai matching techniques
    2. Menunjukkan strength/weakness masing-masing metode
    3. Memenuhi requirement "Feature Detection and Matching"
    
    Returns:
        JSON dengan hasil kedua metode untuk perbandingan
    """
    img1 = await read_upload_image(image1)
    img2 = await read_upload_image(image2)
    
    # SIFT matching
    sift_result = feature_matching_sift(img1, img2, max_matches=20)
    
    # Template matching (gunakan img1 sebagai template)
    template_result = feature_matching_template(img1, img2)
    
    return {
        "comparison": {
            "sift": {
                "method": "SIFT",
                "matched_points": sift_result.get("matched_points", 0),
                "keypoints_img1": sift_result.get("keypoints_image1", 0),
                "keypoints_img2": sift_result.get("keypoints_image2", 0),
                "visualization_base64": sift_result.get("visualization_base64"),
            },
            "template_matching": {
                "method": "Template_Matching",
                "matched_locations": len(template_result.get("matched_locations", [])),
                "visualization_base64": template_result.get("visualization_base64"),
            },
        },
        "analysis": {
            "sift_strengths": [
                "Invariant terhadap scale dan rotation",
                "Robust untuk berbagai perspective",
                "Cocok untuk matching complex patterns",
            ],
            "template_strengths": [
                "Lebih cepat untuk pattern yang jelas",
                "Multi-scale support built-in",
                "Sederhana dan reliable untuk exact patterns",
            ],
        },
    }
