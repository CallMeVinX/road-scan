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


# ============================================================================
# FITUR BARU 1: QUANTIZATION (Kuantisasi - Pengurangan Kedalaman Warna)
# ============================================================================

def quantize_image(image: np.ndarray, bits_per_channel: int) -> tuple[np.ndarray, dict]:
    """
    Kuantisasi citra: Mengurangi kedalaman bit per channel warna.
    
    Contoh:
    - bits_per_channel=8: 24-bit RGB (8+8+8, standar)
    - bits_per_channel=4: 12-bit RGB (4+4+4)
    - bits_per_channel=2: 6-bit RGB (2+2+2, 64 warna)
    - bits_per_channel=1: 3-bit RGB (1+1+1, 8 warna)
    
    Args:
        image: BGR image from OpenCV
        bits_per_channel: Jumlah bit per channel (1-8)
    
    Returns:
        tuple: (quantized_image, stats_dict)
    """
    bits = max(1, min(bits_per_channel, 8))
    
    # Hitung jumlah level warna
    levels = 2 ** bits
    
    # Quantize: bagi dengan step, bulatkan, kalikan kembali
    step = 256 // levels if levels > 0 else 256
    quantized = (image.astype(np.float32) / step).astype(np.uint8)
    quantized = (quantized * step).astype(np.uint8)
    
    # Hitung statistik
    original_colors = len(np.unique(image.reshape(-1, 3), axis=0))
    quantized_colors = len(np.unique(quantized.reshape(-1, 3), axis=0))
    compression_ratio = (24 / bits) if bits > 0 else 1.0
    
    stats = {
        "original_bits_per_channel": 8,
        "quantized_bits_per_channel": bits,
        "original_possible_colors": 256 ** 3,  # 16,777,216
        "quantized_possible_colors": levels ** 3,
        "original_unique_colors": int(original_colors),
        "quantized_unique_colors": int(quantized_colors),
        "compression_ratio": float(compression_ratio),
        "color_reduction_percent": float((1 - quantized_colors / max(original_colors, 1)) * 100),
    }
    
    return quantized, stats


def get_quantization_levels(image: np.ndarray) -> dict:
    """
    Analisis kedalaman bit dan histogran warna dari citra.
    
    Returns:
        dict berisi histogram dan informasi kedalaman warna
    """
    # Hitung histogram per channel
    hist_b = cv2.calcHist([image], [0], None, [256], [0, 256])
    hist_g = cv2.calcHist([image], [1], None, [256], [0, 256])
    hist_r = cv2.calcHist([image], [2], None, [256], [0, 256])
    
    # Normalize
    hist_b = (hist_b / hist_b.sum()).flatten().tolist()
    hist_g = (hist_g / hist_g.sum()).flatten().tolist()
    hist_r = (hist_r / hist_r.sum()).flatten().tolist()
    
    # Hitung jumlah warna unik
    height, width = image.shape[:2]
    total_pixels = height * width
    unique_colors = len(np.unique(image.reshape(-1, 3), axis=0))
    
    return {
        "width": width,
        "height": height,
        "total_pixels": total_pixels,
        "unique_colors": unique_colors,
        "color_diversity_percent": float((unique_colors / (256**3)) * 100),
        "histogram_blue": hist_b,
        "histogram_green": hist_g,
        "histogram_red": hist_r,
    }


# ============================================================================
# FITUR BARU 2: NOISE SIMULATION & REMOVAL (Simulasi & Penghilangan Noise)
# ============================================================================

def add_salt_pepper_noise(image: np.ndarray, probability: float = 0.01) -> tuple[np.ndarray, dict]:
    """
    Tambahkan Salt & Pepper Noise ke citra.
    
    Salt & Pepper Noise: Random piksel berubah menjadi putih (255) atau hitam (0)
    Sangat umum pada gambar yang dikompres atau yang tidak sempurna.
    
    Args:
        image: BGR image
        probability: Probabilitas piksel terkena noise (0.0 - 1.0, default 0.01 = 1%)
    
    Returns:
        tuple: (noisy_image, stats_dict)
    """
    prob = max(0.0, min(probability, 0.5))
    output = image.copy().astype(np.float32)
    
    h, w = image.shape[:2]
    num_pixels = h * w
    num_salt = int(num_pixels * prob / 2)
    num_pepper = int(num_pixels * prob / 2)
    
    # Add salt (white pixels)
    for _ in range(num_salt):
        y = np.random.randint(0, h)
        x = np.random.randint(0, w)
        output[y, x] = [255, 255, 255]
    
    # Add pepper (black pixels)
    for _ in range(num_pepper):
        y = np.random.randint(0, h)
        x = np.random.randint(0, w)
        output[y, x] = [0, 0, 0]
    
    output = np.clip(output, 0, 255).astype(np.uint8)
    
    stats = {
        "noise_type": "salt_pepper",
        "noise_probability": prob,
        "pixels_affected": num_salt + num_pepper,
        "total_pixels": num_pixels,
        "noise_percentage": float((num_salt + num_pepper) / num_pixels * 100),
    }
    
    return output, stats


def add_gaussian_noise(image: np.ndarray, std_dev: float = 25.0) -> tuple[np.ndarray, dict]:
    """
    Tambahkan Gaussian Noise ke citra.
    
    Gaussian Noise: Random nilai noise mengikuti distribusi normal
    Umum terjadi pada foto dengan ISO tinggi atau sensor dengan gain tinggi.
    
    Args:
        image: BGR image
        std_dev: Standard deviation dari noise (0-100, default 25)
    
    Returns:
        tuple: (noisy_image, stats_dict)
    """
    std = max(0.0, min(std_dev, 100.0))
    
    # Generate Gaussian noise
    noise = np.random.normal(0, std, image.shape).astype(np.float32)
    
    # Add noise ke image
    noisy = image.astype(np.float32) + noise
    noisy = np.clip(noisy, 0, 255).astype(np.uint8)
    
    # Hitung SNR (Signal-to-Noise Ratio) sederhana
    signal_power = np.mean(image.astype(np.float32) ** 2)
    noise_power = std ** 2
    snr = 10 * np.log10(signal_power / (noise_power + 1e-8))
    
    stats = {
        "noise_type": "gaussian",
        "std_deviation": float(std),
        "noise_power": float(noise_power),
        "signal_to_noise_ratio_db": float(snr),
    }
    
    return noisy, stats


def remove_noise_bilateral(image: np.ndarray, diameter: int = 9, sigma_color: float = 75.0, sigma_space: float = 75.0) -> tuple[np.ndarray, dict]:
    """
    Hilangkan noise menggunakan Bilateral Filter.
    
    Bilateral Filter: Sangat efektif menghilangkan noise sambil mempertahankan edges.
    Cocok untuk pavement damage karena edge retakan tetap tajam.
    
    Args:
        image: BGR image
        diameter: Diameter neighborhood pixel (default 9)
        sigma_color: Sigma untuk domain warna (default 75)
        sigma_space: Sigma untuk domain spasial (default 75)
    
    Returns:
        tuple: (denoised_image, stats_dict)
    """
    d = max(3, min(diameter, 25))
    if d % 2 == 0:
        d += 1  # Pastikan ganjil
    
    denoised = cv2.bilateralFilter(image, d, sigma_color, sigma_space)
    
    # Hitung perbedaan (perkiraan noise yang dihilangkan)
    diff = cv2.absdiff(image.astype(np.float32), denoised.astype(np.float32))
    noise_reduced = np.mean(diff)
    
    stats = {
        "filter_type": "bilateral",
        "diameter": d,
        "sigma_color": float(sigma_color),
        "sigma_space": float(sigma_space),
        "avg_noise_reduction": float(noise_reduced),
    }
    
    return denoised, stats


def remove_noise_morphology(image: np.ndarray, kernel_size: int = 5) -> tuple[np.ndarray, dict]:
    """
    Hilangkan noise menggunakan Morphological Operations (opening).
    
    Morphological Opening: Erosion followed by dilation
    Efektif menghilangkan small noise sambil mempertahankan struktur utama.
    
    Args:
        image: BGR image
        kernel_size: Ukuran kernel (ganjil, default 5)
    
    Returns:
        tuple: (denoised_image, stats_dict)
    """
    k = max(3, min(kernel_size, 21))
    if k % 2 == 0:
        k += 1  # Pastikan ganjil
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    
    # Apply morphological opening
    denoised = cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel, iterations=1)
    
    stats = {
        "filter_type": "morphological_opening",
        "kernel_size": k,
        "kernel_type": "ellipse",
    }
    
    return denoised, stats


# ============================================================================
# FITUR BARU 3: FEATURE MATCHING (Pencocokan Fitur Antar Gambar)
# ============================================================================

def feature_matching_sift(image1: np.ndarray, image2: np.ndarray, max_matches: int = 20) -> dict:
    """
    Deteksi dan cocokkan fitur SIFT antara dua gambar.
    
    SIFT (Scale-Invariant Feature Transform):
    - Invariant terhadap scale, rotation, dan perspective change
    - Cocok untuk matching pavement damage across berbagai sudut
    
    Args:
        image1: Query image (BGR)
        image2: Reference image (BGR)
        max_matches: Maximum number of matches to return (default 20)
    
    Returns:
        dict dengan matched points dan visualization
    """
    try:
        # Inisialisasi SIFT detector
        sift = cv2.SIFT_create()
        
        # Detect keypoints dan descriptors
        kp1, des1 = sift.detectAndCompute(image1, None)
        kp2, des2 = sift.detectAndCompute(image2, None)
        
        if des1 is None or des2 is None or len(kp1) == 0 or len(kp2) == 0:
            return {
                "matched_points": 0,
                "keypoints_image1": 0,
                "keypoints_image2": 0,
                "error": "Tidak ada fitur yang terdeteksi di salah satu gambar",
                "visualization_base64": None,
            }
        
        # Gunakan BFMatcher (Brute Force Matcher)
        bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=False)
        matches = bf.knnMatch(des1, des2, k=2)
        
        # Lowe's ratio test untuk filter good matches
        good_matches = []
        for match_pair in matches:
            if len(match_pair) == 2:
                m, n = match_pair
                if m.distance < 0.7 * n.distance:  # Threshold 0.7
                    good_matches.append(m)
        
        # Batasi jumlah matches
        good_matches = good_matches[:max_matches]
        
        # Draw matches
        h1, w1 = image1.shape[:2]
        h2, w2 = image2.shape[:2]
        
        # Create canvas untuk visualization
        canvas = np.zeros((max(h1, h2), w1 + w2, 3), dtype=np.uint8)
        canvas[0:h1, 0:w1] = image1
        canvas[0:h2, w1:w1+w2] = image2
        
        # Draw keypoints dan matching lines
        for match in good_matches:
            pt1 = tuple(map(int, kp1[match.queryIdx].pt))
            pt2 = tuple(map(int, kp2[match.trainIdx].pt))
            pt2_offset = (pt2[0] + w1, pt2[1])
            
            # Random color untuk setiap match
            color = tuple(map(int, np.random.rand(3) * 255))
            
            cv2.circle(canvas, pt1, 5, color, -1)
            cv2.circle(canvas, pt2_offset, 5, color, -1)
            cv2.line(canvas, pt1, pt2_offset, color, 1)
        
        # Convert ke base64
        from app.utils.image_io import encode_image_base64
        viz_base64 = encode_image_base64(canvas)
        
        match_details = []
        for match in good_matches:
            match_details.append({
                "distance": float(match.distance),
                "point1": {"x": int(kp1[match.queryIdx].pt[0]), "y": int(kp1[match.queryIdx].pt[1])},
                "point2": {"x": int(kp2[match.trainIdx].pt[0]), "y": int(kp2[match.trainIdx].pt[1])},
            })
        
        return {
            "matched_points": len(good_matches),
            "keypoints_image1": len(kp1),
            "keypoints_image2": len(kp2),
            "match_details": match_details,
            "visualization_base64": viz_base64,
        }
    
    except Exception as e:
        return {
            "matched_points": 0,
            "error": str(e),
            "visualization_base64": None,
        }


def feature_matching_template(template: np.ndarray, image: np.ndarray) -> dict:
    """
    Template Matching: Cari posisi template dalam gambar yang lebih besar.

    Cocok untuk:
    - Mendeteksi pola retakan yang sama di berbagai lokasi
    - Matching kerusakan pavement yang terlihat identik
    - Untuk gambar sama besar: akan otomatis crop template dari center

    Args:
        template: Template citra (BGR)
        image: Citra target untuk dicari (BGR)

    Returns:
        dict dengan match locations dan scores
    """
    try:
        template_img = template.copy()
        search_img = image.copy()

        # Jika template lebih besar atau sama dengan image, crop template dari center
        if template_img.shape[0] >= search_img.shape[0] or template_img.shape[1] >= search_img.shape[1]:
            # Crop template menjadi 70% dari dimensi yang lebih kecil
            max_h = min(int(search_img.shape[0] * 0.7), int(template_img.shape[0] * 0.7))
            max_w = min(int(search_img.shape[1] * 0.7), int(template_img.shape[1] * 0.7))

            # Crop dari center
            t_h, t_w = template_img.shape[:2]
            start_y = (t_h - max_h) // 2
            start_x = (t_w - max_w) // 2
            template_img = template_img[start_y:start_y+max_h, start_x:start_x+max_w]

            # Jika search_img juga terlalu kecil, skip
            if template_img.shape[0] >= search_img.shape[0] or template_img.shape[1] >= search_img.shape[1]:
                return {
                    "matched_locations": [],
                    "error": "Gambar terlalu kecil untuk template matching. Gunakan SIFT untuk gambar dengan ukuran sangat berbeda.",
                    "suggestion": "Coba gunakan SIFT Matching untuk perbandingan gambar ini",
                }

        # Multi-scale template matching
        gray_template = cv2.cvtColor(template_img, cv2.COLOR_BGR2GRAY)
        gray_image = cv2.cvtColor(search_img, cv2.COLOR_BGR2GRAY)

        matches = []

        # Coba berbagai scale (0.5x, 0.75x, 1.0x, 1.25x, 1.5x)
        for scale in [0.5, 0.75, 1.0, 1.25, 1.5]:
            scaled_template = cv2.resize(gray_template, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)

            if scaled_template.shape[0] >= gray_image.shape[0] or scaled_template.shape[1] >= gray_image.shape[1]:
                continue

            # Template matching dengan correlation coefficient
            result = cv2.matchTemplate(gray_image, scaled_template, cv2.TM_CCOEFF_NORMED)

            # Cari local maxima (threshold > 0.7)
            loc = np.where(result >= 0.7)

            for pt in zip(*loc[::-1]):
                matches.append({
                    "x": int(pt[0]),
                    "y": int(pt[1]),
                    "scale": float(scale),
                    "confidence": float(result[pt[1], pt[0]]),
                    "width": int(scaled_template.shape[1]),
                    "height": int(scaled_template.shape[0]),
                })
        
        # Sort by confidence
        matches.sort(key=lambda x: x["confidence"], reverse=True)
        
        # PERBAIKAN BUG 2: Filter overlap (Non-Maximum Suppression sederhana)
        filtered_matches = []
        for match in matches:
            overlap = False
            for f_match in filtered_matches:
                # Hitung jarak titik tengah antar kotak
                dist = np.sqrt((match["x"] - f_match["x"])**2 + (match["y"] - f_match["y"])**2)
                # Jika jaraknya kurang dari setengah lebar template, anggap objek yang sama
                if dist < (match["width"] / 2):
                    overlap = True
                    break
            
            if not overlap:
                filtered_matches.append(match)
                if len(filtered_matches) >= 10:  # Batasi top 10 kotak yang terpisah
                    break
        
        # Draw matches pada image menggunakan filtered_matches
        overlay = search_img.copy()
        for i, match in enumerate(filtered_matches):
            x, y = match["x"], match["y"]
            w, h = match["width"], match["height"]
            color = (0, 255 - (i * 20), i * 20)  # Color gradient
            cv2.rectangle(overlay, (x, y), (x+w, y+h), color, 2)
            cv2.putText(overlay, f"{match['confidence']:.2f}", (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        from app.utils.image_io import encode_image_base64
        viz_base64 = encode_image_base64(overlay)

        return {
            "matched_locations": filtered_matches,
            "total_matches": len(filtered_matches),
            "template_width": template_img.shape[1],
            "template_height": template_img.shape[0],
            "image_width": search_img.shape[1],
            "image_height": search_img.shape[0],
            "visualization_base64": viz_base64,
        }
    
    except Exception as e:
        return {
            "matched_locations": [],
            "error": str(e),
        }

def remove_noise_median(image: np.ndarray, kernel_size: int = 5) -> tuple[np.ndarray, dict]:
    # Median filter butuh ukuran kernel angka ganjil (3, 5, 7, dst)
    k = max(3, min(kernel_size, 21))
    if k % 2 == 0:
        k += 1
        
    denoised = cv2.medianBlur(image, k)
    
    stats = {
        "filter_type": "median",
        "kernel_size": k,
    }
    return denoised, stats