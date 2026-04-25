from fastapi import APIRouter, File, UploadFile
from app.services.cv_service import analyze_pavement_damage
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/")
async def analyze_damage(file: UploadFile = File(...)) -> dict:
    """
    Analisis kerusakan jalan dengan deteksi fitur dan penilaian standar mutu.
    
    Returns:
        - geometri_base64: Visualisasi geometri/bentuk kerusakan
        - pola_retakan_base64: Pola retakan yang terdeteksi
        - klaster_warna_base64: Segmentasi warna berdasarkan clustering
        - tekstur_permukaan_base64: Analisis tekstur permukaan
        - bentuk_normal: Score bentuk normal (0-1)
        - tekstur_utuh: Score tekstur utuh (0-1)
        - cacat_partial_sour: Score cacat area (sour spot)
        - skor_akhir: Skor akhir mutu (0-100)
    """
    image = await read_upload_image(file)
    
    analysis_result = analyze_pavement_damage(image)
    
    # Encode gambar hasil analisis ke base64
    result = {
        "bentuk_normal": analysis_result["bentuk_normal"],
        "tekstur_utuh": analysis_result["tekstur_utuh"],
        "cacat_partial_sour": analysis_result["cacat_partial_sour"],
        "skor_akhir": analysis_result["skor_akhir"],
    }
    
    # Tambahkan gambar hasil analisis jika tersedia
    if analysis_result.get("geometri_image") is not None:
        result["geometri_base64"] = encode_image_base64(analysis_result["geometri_image"])
    
    if analysis_result.get("pola_retakan_image") is not None:
        result["pola_retakan_base64"] = encode_image_base64(analysis_result["pola_retakan_image"])
    
    if analysis_result.get("klaster_warna_image") is not None:
        result["klaster_warna_base64"] = encode_image_base64(analysis_result["klaster_warna_image"])
    
    if analysis_result.get("tekstur_permukaan_image") is not None:
        result["tekstur_permukaan_base64"] = encode_image_base64(analysis_result["tekstur_permukaan_image"])
    
    return result
