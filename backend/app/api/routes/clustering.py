from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import kmeans_segmentation
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/kmeans")
async def unsupervised_kmeans(
    file: UploadFile = File(...),
    k: int = Form(3),
) -> dict:
    image = await read_upload_image(file)
    segmented, percentages, clusters = kmeans_segmentation(
        image=image,
        n_clusters=max(3, min(k, 6)),
    )

    return {
        "k": max(3, min(k, 6)),
        "percentages": percentages,
        "clusters": clusters,
        "segmented_base64": encode_image_base64(segmented),
    }
