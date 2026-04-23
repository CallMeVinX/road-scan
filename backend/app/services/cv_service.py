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
        
        # ---------------------------------------------------------------
        # PENAMBAHAN: NOISE REDUCTION DENGAN GAUSSIAN BLUR
        # Alasan teoritis: Gambar jalan sering memiliki noise dari kompresi JPEG
        # atau kondisi capture. Gaussian blur mengurangi noise sambil mempertahankan edges.
        # Kernel size 3x3 cukup untuk noise reduction ringan tanpa menghilangkan detail retakan.
        # ---------------------------------------------------------------
        output = cv2.GaussianBlur(output, (3, 3), 0)

    if thresholding:
        if output.ndim == 3:
            output = cv2.cvtColor(output, cv2.COLOR_BGR2GRAY)
            output = cv2.GaussianBlur(output, (3, 3), 0)
        # ---------------------------------------------------------------
        # PERBAIKAN: GANTI THRESHOLD GLOBAL DENGAN OTSU
        # Alasan teoritis: Threshold global (127) tidak adaptif terhadap variasi pencahayaan.
        # Otsu's method secara otomatis menemukan threshold optimal berdasarkan histogram bimodal.
        # Lebih robust untuk gambar jalan dengan kontras yang bervariasi.
        # ---------------------------------------------------------------
        _, output = cv2.threshold(output, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return output


def edge_detection_3x3(image: np.ndarray) -> tuple[np.ndarray, list[list[int]], dict[str, float]]:
    # ---------------------------------------------------------------
    # PERBAIKAN: GANTI KERNEL CUSTOM DENGAN SOBEL OPERATOR
    # Alasan teoritis: Kernel custom [-1,-1,-1; -1,8,-1; -1,-1,-1] adalah high-pass filter
    # sederhana, tapi Sobel lebih sophisticated karena menggunakan gradient approximation
    # yang lebih akurat untuk deteksi edge horizontal dan vertikal.
    # dx=1, dy=0 untuk horizontal edges; dx=0, dy=1 untuk vertical edges.
    # ksize=3 untuk kernel 3x3.
    # ---------------------------------------------------------------
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Sobel untuk horizontal dan vertical gradients
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    
    # Magnitude gradient
    magnitude = cv2.magnitude(sobelx, sobely)
    
    # Normalize ke 0-255
    normalized = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Kernel Sobel x (contoh)
    kernel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)

    stats = {
        "min": float(np.min(normalized)),
        "max": float(np.max(normalized)),
        "mean": float(np.mean(normalized)),
    }

    return normalized, kernel_x.astype(int).tolist(), stats


def morphology_transform(
    image: np.ndarray,
    operation: str,
    iterations: int,
    kernel_size: int = 3,
) -> tuple[np.ndarray, np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # ---------------------------------------------------------------
    # PERBAIKAN: GANTI ADAPTIVE THRESHOLDING DENGAN CANNY EDGE DETECTION
    # Alasan teoritis: Adaptive thresholding terlalu sensitif terhadap variasi pencahayaan
    # pada jalan raya. Canny lebih robust karena menggunakan hysteresis thresholding
    # dan non-maximum suppression untuk menghasilkan edge yang lebih bersih dan kontinyu.
    # Parameter: lower=50, upper=150 adalah standar untuk deteksi edge pada gambar natural.
    # ---------------------------------------------------------------
    base_mask = cv2.Canny(gray, 50, 150)

    k_size = max(1, kernel_size)
    kernel = np.ones((k_size, k_size), dtype=np.uint8)

    if operation == "dilation":
        # Menebalkan edge untuk mengisi celah kecil pada retakan
        transformed = cv2.dilate(base_mask, kernel, iterations=iterations)
    elif operation == "erosion":
        # Mengikis noise kecil sambil mempertahankan struktur retakan utama
        transformed = cv2.erode(base_mask, kernel, iterations=iterations)
    elif operation == "opening":
        # Erosion followed by dilation - menghilangkan noise kecil tanpa mengubah ukuran objek
        transformed = cv2.morphologyEx(base_mask, cv2.MORPH_OPEN, kernel, iterations=iterations)
    elif operation == "closing":
        # Dilation followed by erosion - menutup celah kecil pada retakan
        transformed = cv2.morphologyEx(base_mask, cv2.MORPH_CLOSE, kernel, iterations=iterations)
    else:
        transformed = base_mask

    return transformed, transformed


def harris_corners(
    image: np.ndarray,
    threshold_ratio: float,
    max_points: int,
) -> tuple[np.ndarray, list[dict[str, float]], int]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray_f32 = np.float32(gray)

    # Deteksi Harris Corner
    
    response = cv2.cornerHarris(gray_f32, blockSize=2, ksize=3, k=0.04)
    response = cv2.dilate(response, None)

    threshold = threshold_ratio * float(response.max())
    ys, xs = np.where(response > threshold)

    # PERBAIKAN: 
    # Kumpulkan semua titik beserta nilai "ketajamannya" (response value)
    all_corners = []
    for x, y in zip(xs, ys):
        all_corners.append(
            {
                "x": int(x),
                "y": int(y),
                "response": float(response[y, x]),
            }
        )

    # Urutkan titik dari nilai ketajaman paling tinggi (menurun)
    all_corners.sort(key=lambda item: item["response"], reverse=True)

    # Ambil titik terbaik saja sesuai batas maksimal (misal: 500 terbaik)
    best_corners = all_corners[:max_points]

    # Gambar titik merah pada gambar asli
    overlay = image.copy()
    for corner in best_corners:
        cv2.circle(overlay, (corner["x"], corner["y"]), 3, (0, 0, 255), -1)

    # Kembalikan gambar, titik terbaik, dan total titik awal
    return overlay, best_corners, len(all_corners)


def kmeans_segmentation(
    image: np.ndarray,
    n_clusters: int,
) -> tuple[np.ndarray, dict[str, float], list[dict[str, float]]]:
    # ---------------------------------------------------------------
    # PERBAIKAN: OPTIMASI PARAMETER UNTUK DETEKSI KERUSAKAN JALAN
    # n_clusters: Untuk gambar jalan, 4-5 cluster lebih baik (jalan gelap, retakan gelap,
    # garis putih, bayangan, background). Tapi batasi maksimal 5 untuk performa.
    # random_state: Tetap untuk reproducibility.
    # ---------------------------------------------------------------
    n_clusters = max(3, min(n_clusters, 5))  # Batasi antara 3-5 cluster
    
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape((-1, 3)).astype(np.float32)

    model = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    labels = model.fit_predict(pixels)
    centers = model.cluster_centers_

    # Hitung brightness untuk klasifikasi semantic
    brightness = centers.mean(axis=1)
    
    # Urutkan cluster berdasarkan brightness
    sorted_indices = np.argsort(brightness)
    
    # Asumsi semantic berdasarkan brightness:
    # - Terdark: damage (retakan gelap)
    # - Dark: normal road
    # - Medium: shadows/lines
    # - Bright: white lines
    # - Terbright: highlights/reflections
    semantic_map = {}
    semantic_names = ["damage", "road", "shadow", "line", "highlight"]
    
    for i, idx in enumerate(sorted_indices):
        if i < len(semantic_names):
            semantic_map[idx] = semantic_names[i]
        else:
            semantic_map[idx] = "other"

    semantic_bgr = {
        "damage": np.array([216, 78, 29], dtype=np.uint8),    # Orange-red untuk damage
        "road": np.array([128, 114, 107], dtype=np.uint8),    # Gray untuk jalan normal
        "shadow": np.array([64, 64, 64], dtype=np.uint8),     # Dark gray untuk bayangan
        "line": np.array([245, 245, 245], dtype=np.uint8),    # White untuk garis
        "highlight": np.array([255, 255, 255], dtype=np.uint8), # Bright white
        "other": np.array([128, 128, 128], dtype=np.uint8),   # Neutral gray
    }

    segmented = np.zeros_like(image)
    total_pixels = labels.shape[0]

    percentages = {name: 0.0 for name in semantic_names + ["other"]}

    raw_cluster_info = []

    for cluster_idx in range(n_clusters):
        mask = labels == cluster_idx
        semantic_class = semantic_map.get(cluster_idx, "other")
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


def contour_tracking(image: np.ndarray) -> tuple[np.ndarray, int]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # ---------------------------------------------------------------
    # PERBAIKAN: GANTI THRESHOLD SEDERHANA DENGAN ADAPTIVE THRESHOLDING
    # Alasan teoritis: Threshold global (127) tidak cocok untuk gambar jalan yang memiliki
    # variasi pencahayaan tinggi. Adaptive thresholding menghitung threshold lokal
    # berdasarkan neighborhood, lebih robust terhadap shadow dan lighting variation.
    # Parameter: blockSize=21 (ganjil), C=5 (konstanta pengurang) untuk mengurangi noise.
    # ---------------------------------------------------------------
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
    )
    
    # Morphological opening untuk menghilangkan noise kecil
    kernel = np.ones((3, 3), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter kontur berdasarkan area untuk menghindari noise kecil
    min_area = 50  # Minimum area kontur (dalam pixel)
    filtered_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > min_area]
    
    overlay = image.copy()
    cv2.drawContours(overlay, filtered_contours, -1, (0, 255, 0), 2)
    
    return overlay, len(filtered_contours)

def apply_binary_threshold(image: np.ndarray) -> np.ndarray:
    """Mengubah gambar menjadi hitam putih (biner) berdasarkan threshold statis."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Thresholding Otsu seringkali terbaik untuk aspal
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh

def apply_adaptive_threshold(image: np.ndarray) -> np.ndarray:
    """Mengatasi pencahayaan tidak merata dengan thresholding lokal."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Berguna jika ada bayangan di jalan raya
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    return thresh

def apply_gaussian_blur(image: np.ndarray) -> np.ndarray:
    """Menghaluskan citra untuk mengurangi noise tekstur aspal yang kasar."""
    # Kernel 5x5 biasanya cukup untuk smoothing dasar
    blurred = cv2.GaussianBlur(image, (5, 5), 0)
    return blurred