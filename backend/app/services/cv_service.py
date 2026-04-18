import cv2
import numpy as np
from sklearn.cluster import KMeans


def preprocess_image(
    image: np.ndarray,
    grayscale: bool,
    thresholding: bool,
    threshold_value: int,
) -> np.ndarray:
    output = image.copy()

    if grayscale:
        output = cv2.cvtColor(output, cv2.COLOR_BGR2GRAY)

    if thresholding:
        if output.ndim == 3:
            output = cv2.cvtColor(output, cv2.COLOR_BGR2GRAY)
        _, output = cv2.threshold(output, threshold_value, 255, cv2.THRESH_BINARY)

    return output


def edge_detection_3x3(image: np.ndarray) -> tuple[np.ndarray, list[list[int]], dict[str, float]]:
    kernel = np.array(
        [
            [-1, -1, -1],
            [-1, 8, -1],
            [-1, -1, -1],
        ],
        dtype=np.float32,
    )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    response = cv2.filter2D(gray, -1, kernel)
    normalized = cv2.normalize(response, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    stats = {
        "min": float(np.min(normalized)),
        "max": float(np.max(normalized)),
        "mean": float(np.mean(normalized)),
    }

    return normalized, kernel.astype(int).tolist(), stats


def morphology_transform(
    image: np.ndarray,
    operation: str,
    iterations: int,
) -> tuple[np.ndarray, np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, crack_mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    kernel = np.ones((3, 3), dtype=np.uint8)

    if operation == "dilation":
        transformed = cv2.dilate(crack_mask, kernel, iterations=iterations)
    else:
        transformed = cv2.erode(crack_mask, kernel, iterations=iterations)

    overlay = image.copy()
    overlay[transformed > 0] = (255, 255, 255)

    return transformed, overlay


def harris_corners(
    image: np.ndarray,
    threshold_ratio: float,
    max_points: int,
) -> tuple[np.ndarray, list[dict[str, float]], int]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray_f32 = np.float32(gray)

    response = cv2.cornerHarris(gray_f32, blockSize=2, ksize=3, k=0.04)
    response = cv2.dilate(response, None)

    threshold = threshold_ratio * float(response.max())
    ys, xs = np.where(response > threshold)

    corners = []
    for x, y in zip(xs[:max_points], ys[:max_points]):
        corners.append(
            {
                "x": int(x),
                "y": int(y),
                "response": float(response[y, x]),
            }
        )

    overlay = image.copy()
    for corner in corners:
        cv2.circle(overlay, (int(corner["x"]), int(corner["y"])), 3, (0, 0, 255), -1)

    return overlay, corners, len(xs)


def kmeans_segmentation(
    image: np.ndarray,
    n_clusters: int,
) -> tuple[np.ndarray, dict[str, float], list[dict[str, float]]]:
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape((-1, 3)).astype(np.float32)

    model = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    labels = model.fit_predict(pixels)
    centers = model.cluster_centers_

    brightness = centers.mean(axis=1)
    dark_idx = int(np.argmin(brightness))
    bright_idx = int(np.argmax(brightness))
    normal_idx_candidates = [idx for idx in range(n_clusters) if idx not in {dark_idx, bright_idx}]
    normal_idx = normal_idx_candidates[0] if normal_idx_candidates else bright_idx

    semantic_map = {
        dark_idx: "damage",
        normal_idx: "normal",
        bright_idx: "line",
    }

    semantic_bgr = {
        "normal": np.array([128, 114, 107], dtype=np.uint8),
        "damage": np.array([216, 78, 29], dtype=np.uint8),
        "line": np.array([245, 245, 245], dtype=np.uint8),
    }

    segmented = np.zeros_like(image)
    total_pixels = labels.shape[0]

    percentages = {
        "normal": 0.0,
        "damage": 0.0,
        "line": 0.0,
    }

    raw_cluster_info = []

    for cluster_idx in range(n_clusters):
        mask = labels == cluster_idx
        semantic_class = semantic_map.get(cluster_idx, "normal")
        segmented.reshape((-1, 3))[mask] = semantic_bgr[semantic_class]

        pct = float(mask.sum() * 100.0 / total_pixels)
        percentages[semantic_class] += pct

        center_rgb = centers[cluster_idx].tolist()
        raw_cluster_info.append(
            {
                "cluster": int(cluster_idx),
                "semantic": semantic_class,
                "percentage": pct,
                "center_rgb": [float(center_rgb[0]), float(center_rgb[1]), float(center_rgb[2])],
            }
        )

    return segmented, percentages, raw_cluster_info
