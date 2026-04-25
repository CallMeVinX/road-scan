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
    n_clusters = max(3, min(n_clusters, 5))
    
    # ---------------------------------------------------------------
    # PENAMBAHAN: DYNAMIC DOWNSCALING UNTUK MENCEGAH OOM / TIMEOUT
    # Menurunkan resolusi gambar raksasa (misal 4K) menjadi maksimal 800px
    # sebelum K-Means dijalankan. Ini akan memangkas waktu komputasi dari 
    # hitungan menit menjadi di bawah 1 detik.
    # ---------------------------------------------------------------
    original_height, original_width = image.shape[:2]
    max_dim = 800
    
    if max(original_height, original_width) > max_dim:
        scaling_factor = max_dim / float(max(original_height, original_width))
        new_size = (int(original_width * scaling_factor), int(original_height * scaling_factor))
        working_image = cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)
    else:
        working_image = image.copy()

    # Gunakan 'working_image' yang sudah diperkecil untuk komputasi
    rgb = cv2.cvtColor(working_image, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape((-1, 3)).astype(np.float32)

    model = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    labels = model.fit_predict(pixels)
    centers = model.cluster_centers_

    brightness = centers.mean(axis=1)
    sorted_indices = np.argsort(brightness)
    
    semantic_map = {}
    semantic_names = ["damage", "road", "shadow", "line", "highlight"]
    
    for i, idx in enumerate(sorted_indices):
        if i < len(semantic_names):
            semantic_map[idx] = semantic_names[i]
        else:
            semantic_map[idx] = "other"

    semantic_bgr = {
        "damage": np.array([216, 78, 29], dtype=np.uint8),    
        "road": np.array([128, 114, 107], dtype=np.uint8),    
        "shadow": np.array([64, 64, 64], dtype=np.uint8),     
        "line": np.array([245, 245, 245], dtype=np.uint8),    
        "highlight": np.array([255, 255, 255], dtype=np.uint8), 
        "other": np.array([128, 128, 128], dtype=np.uint8),   
    }

    # Buat kanvas kosong seukuran gambar yang diperkecil
    segmented = np.zeros_like(working_image)
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

    # ---------------------------------------------------------------
    # PENAMBAHAN: UPSCALING KEMBALI KE UKURAN ASLI
    # Mengembalikan gambar hasil segmentasi ke resolusi aslinya (misal 4K)
    # Menggunakan cv2.INTER_NEAREST sangat krusial di sini agar warna 
    # klaster tidak menjadi blur/bercampur di bagian tepinya.
    # ---------------------------------------------------------------
    if max(original_height, original_width) > max_dim:
        segmented = cv2.resize(segmented, (original_width, original_height), interpolation=cv2.INTER_NEAREST)

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


def analyze_pavement_damage(image: np.ndarray) -> dict:
    """
    Analisis kerusakan jalan dengan deteksi fitur dan penilaian standar mutu.
    
    Menggunakan kombinasi teknik CV untuk mendeteksi:
    - Bentuk normal (circularity ideal)
    - Tekstur utuh (retakan)
    - Cacat partial sour (area cokelat/keruh)
    
    Args:
        image: Gambar jalan dalam format BGR (OpenCV)
    
    Returns:
        dict dengan kunci:
        - bentuk_normal: Score 0-1 untuk bentuk normal
        - tekstur_utuh: Score 0-1 untuk tekstur utuh
        - cacat_partial_sour: Score 0-1 untuk cacat
        - skor_akhir: Skor akhir mutu (0-100)
        - geometri_image, pola_retakan_image, klaster_warna_image, tekstur_permukaan_image (optional)
    """
    
    # Downscale gambar untuk analisis cepat
    h, w = image.shape[:2]
    max_dim = 800
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    
    # ===== 1. Analisis Bentuk Normal (Circularity) =====
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Edge detection untuk menemukan kontur
    canny = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(canny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bentuk_normal_scores = []
    geometri_image = image.copy()
    
    if len(contours) > 0:
        # Ambil contour terbesar (area kerusakan utama)
        largest_contour = max(contours, key=cv2.contourArea)
        
        if cv2.contourArea(largest_contour) > 100:
            # Hitung circularity: 4π * area / perimeter^2
            area = cv2.contourArea(largest_contour)
            perimeter = cv2.arcLength(largest_contour, True)
            
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter ** 2)
                # Circularity sempurna adalah 1.0 (lingkaran)
                # Normalize ke range [0, 1]
                bentuk_normal_score = min(1.0, circularity)
                bentuk_normal_scores.append(bentuk_normal_score)
            
            # Gambar kontur pada geometri_image
            cv2.drawContours(geometri_image, [largest_contour], 0, (0, 255, 0), 2)
    
    bentuk_normal = np.mean(bentuk_normal_scores) if bentuk_normal_scores else 0.85
    
    # ===== 2. Analisis Tekstur Utuh (Retakan) =====
    # Cari retakan kecil menggunakan morphological gradient
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    gradient = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel)
    _, retakan_mask = cv2.threshold(gradient, 30, 255, cv2.THRESH_BINARY)
    
    # Hitung persentase pixel retakan
    retakan_percentage = (retakan_mask > 0).sum() / retakan_mask.size
    # Tekstur utuh = 1 - retakan_percentage
    tekstur_utuh = max(0.0, 1.0 - retakan_percentage)
    
    pola_retakan_image = cv2.cvtColor(retakan_mask, cv2.COLOR_GRAY2BGR)
    
    # ===== 3. Analisis Cacat Partial Sour (Warna) =====
    # Gunakan K-means untuk mendeteksi area cokelat/keruh
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Definisikan range untuk warna cokelat/sour (HSV)
    # Cokelat: H=10-25, S=50-255, V=50-200
    lower_brown = np.array([5, 50, 50])
    upper_brown = np.array([25, 255, 200])
    mask_sour = cv2.inRange(hsv, lower_brown, upper_brown)
    
    sour_percentage = (mask_sour > 0).sum() / mask_sour.size
    # Score cacat: semakin banyak area cokelat, semakin rendah score
    cacat_partial_sour = -sour_percentage  # Negative score menunjukkan kerusakan
    
    klaster_warna_image = cv2.cvtColor(mask_sour, cv2.COLOR_GRAY2BGR)
    
    # ===== 4. Analisis Tekstur Permukaan =====
    # Gunakan Laplacian untuk deteksi tekstur
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    tekstur_permukaan_image = cv2.convertScaleAbs(laplacian)
    tekstur_permukaan_image = cv2.cvtColor(tekstur_permukaan_image, cv2.COLOR_GRAY2BGR)
    
    # ===== Kalkulasi Skor Akhir Mutu =====
    # Berdasarkan kriteria dari gambar:
    # - Bentuk Normal: Circularity ideal (0.85) → +0 pts
    # - Tekstur Utuh: Tidak ditemukan retakan signifikan → +0 pts
    # - Cacat Partial Sour: Area cokelat/keruh 100.0% → -25 pts
    # Total base score = 100 pts
    
    base_score = 100
    
    # Penyesuaian berdasarkan bentuk normal
    if bentuk_normal < 0.75:
        base_score -= 25 * (0.75 - bentuk_normal) / 0.75
    
    # Penyesuaian berdasarkan tekstur utuh
    if tekstur_utuh < 0.85:
        base_score -= 25 * (0.85 - tekstur_utuh) / 0.85
    
    # Penyesuaian berdasarkan cacat partial sour
    if sour_percentage > 0.1:
        base_score -= 25 * min(1.0, sour_percentage / 1.0)
    
    skor_akhir = max(0, min(100, base_score))
    
    return {
        "bentuk_normal": float(bentuk_normal),
        "tekstur_utuh": float(tekstur_utuh),
        "cacat_partial_sour": float(cacat_partial_sour),
        "skor_akhir": float(skor_akhir),
        "geometri_image": geometri_image,
        "pola_retakan_image": pola_retakan_image,
        "klaster_warna_image": klaster_warna_image,
        "tekstur_permukaan_image": tekstur_permukaan_image,
    }