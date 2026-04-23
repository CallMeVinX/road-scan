from fastapi import APIRouter, File, Form, UploadFile

from app.services.cv_service import harris_corners, contour_tracking, morphology_transform, kmeans_segmentation
from app.utils.image_io import encode_image_base64, read_upload_image

router = APIRouter()


@router.post("/harris")
async def feature_detection_harris(
    file: UploadFile = File(...),
    threshold_ratio: float = Form(0.01),
    max_points: int = Form(250),
) -> dict:
    image = await read_upload_image(file)
    overlay, points, all_detected = harris_corners(
        image=image,
        threshold_ratio=max(0.001, min(threshold_ratio, 0.2)),
        max_points=max(10, min(max_points, 5000)),
    )

    return {
        "detected_total": all_detected,
        "returned_points": len(points),
        "points": points,
        "overlay_base64": encode_image_base64(overlay),
    }


@router.post("/contour")
async def feature_detection_contour(file: UploadFile = File(...)) -> dict:
    image = await read_upload_image(file)
    overlay, total_contours = contour_tracking(image)

    return {
        "total_contours": total_contours,
        "overlay_base64": encode_image_base64(overlay),
    }


@router.post("/threshold")
async def feature_detection_threshold(
    file: UploadFile = File(...),
    operation: str = Form("closing"),
    iterations: int = Form(2),
    kernel_size: int = Form(5),
) -> dict:
    """Adaptive thresholding using morphological operations (Canny edge detection)"""
    image = await read_upload_image(file)
    result, _ = morphology_transform(
        image=image,
        operation=operation,
        iterations=max(1, min(iterations, 10)),
        kernel_size=max(3, min(kernel_size, 15)),
    )

    return {
        "operation": operation,
        "iterations": iterations,
        "kernel_size": kernel_size,
        "overlay_base64": encode_image_base64(result),
    }


@router.post("/segmentation")
async def feature_detection_segmentation(
    file: UploadFile = File(...),
    n_clusters: int = Form(4),
) -> dict:
    """K-means clustering segmentation for road classification"""
    image = await read_upload_image(file)
    segmented, percentages, cluster_info = kmeans_segmentation(
        image=image,
        n_clusters=max(3, min(n_clusters, 5)),
    )

    return {
        "n_clusters": max(3, min(n_clusters, 5)),
        "semantic_percentages": percentages,
        "cluster_info": cluster_info,
        "overlay_base64": encode_image_base64(segmented),
    }
