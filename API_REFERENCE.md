# 📚 API Reference - Fitur Baru Road Scan

**Base URL**: `http://127.0.0.1:8000/api/v1`

---

## 1️⃣ QUANTIZATION API

### `POST /quantization/reduce`
Kuantisasi citra dengan mengurangi kedalaman bit per channel.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- file: File (image)
- bits_per_channel: int (1-8, default: 4)
```

**Response**:
```json
{
  "bits_per_channel": 4,
  "quantized_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "original_stats": {
    "width": 1920,
    "height": 1080,
    "total_pixels": 2073600,
    "unique_colors": 2847291,
    "color_diversity_percent": 16.967,
    "histogram_blue": [...],
    "histogram_green": [...],
    "histogram_red": [...]
  },
  "quantization_stats": {
    "original_bits_per_channel": 8,
    "quantized_bits_per_channel": 4,
    "original_possible_colors": 16777216,
    "quantized_possible_colors": 4096,
    "original_unique_colors": 2847291,
    "quantized_unique_colors": 1256,
    "compression_ratio": 2.0,
    "color_reduction_percent": 99.956
  }
}
```

### `POST /quantization/levels`
Analisis histogram dan kedalaman warna citra.

**Request**:
```
Content-Type: multipart/form-data
Parameters: file (image only)
```

**Response**:
```json
{
  "color_analysis": {
    "width": 1920,
    "height": 1080,
    "total_pixels": 2073600,
    "unique_colors": 2847291,
    "color_diversity_percent": 16.967,
    "histogram_blue": [0.001, 0.002, ...],
    "histogram_green": [0.001, 0.003, ...],
    "histogram_red": [0.002, 0.001, ...]
  },
  "description": "Analisis histogram per channel (Blue, Green, Red) dan statistik kedalaman warna"
}
```

---

## 2️⃣ NOISE API

### `POST /noise/add-salt-pepper`
Tambahkan Salt & Pepper Noise ke citra.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- file: File (image)
- probability: float (0.0-0.5, default: 0.01)
```

**Response**:
```json
{
  "noise_type": "salt_pepper",
  "noisy_image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "noise_stats": {
    "noise_type": "salt_pepper",
    "noise_probability": 0.05,
    "pixels_affected": 103680,
    "total_pixels": 2073600,
    "noise_percentage": 5.0
  }
}
```

### `POST /noise/add-gaussian`
Tambahkan Gaussian Noise ke citra.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- file: File (image)
- std_dev: float (0-100, default: 25)
```

**Response**:
```json
{
  "noise_type": "gaussian",
  "noisy_image_base64": "...",
  "noise_stats": {
    "noise_type": "gaussian",
    "std_deviation": 25.0,
    "noise_power": 625.0,
    "signal_to_noise_ratio_db": 18.54
  }
}
```

### `POST /noise/remove-bilateral`
Hilangkan noise menggunakan Bilateral Filter.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- file: File (image)
- diameter: int (3-25, default: 9)
- sigma_color: float (default: 75)
- sigma_space: float (default: 75)
```

**Response**:
```json
{
  "filter_type": "bilateral",
  "denoised_image_base64": "...",
  "filter_stats": {
    "filter_type": "bilateral",
    "diameter": 9,
    "sigma_color": 75.0,
    "sigma_space": 75.0,
    "avg_noise_reduction": 23.45
  }
}
```

### `POST /noise/remove-morphology`
Hilangkan noise menggunakan Morphological Opening.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- file: File (image)
- kernel_size: int (3-21, default: 5)
```

**Response**:
```json
{
  "filter_type": "morphological_opening",
  "denoised_image_base64": "...",
  "filter_stats": {
    "filter_type": "morphological_opening",
    "kernel_size": 5,
    "kernel_type": "ellipse"
  }
}
```

### `POST /noise/compare`
Bandingkan berbagai metode penghilangan noise.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- file: File (image)
- noise_type: string ("salt_pepper" atau "gaussian", default: "salt_pepper")
- noise_intensity: float (0.0-1.0, default: 0.05)
```

**Response**:
```json
{
  "noise_type": "salt_pepper",
  "noise_stats": {...},
  "results": {
    "noisy_image_base64": "...",
    "bilateral_filtered_base64": "...",
    "morphology_filtered_base64": "..."
  },
  "filter_comparison": {
    "bilateral_stats": {...},
    "morphology_stats": {...}
  }
}
```

---

## 3️⃣ FEATURE MATCHING API

### `POST /feature-matching/sift`
SIFT Feature Matching antara dua gambar.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- image1: File (query image)
- image2: File (reference image)
- max_matches: int (default: 20)
```

**Response**:
```json
{
  "method": "SIFT",
  "description": "Scale-Invariant Feature Transform - robust matching untuk berbagai kondisi",
  "matched_points": 15,
  "keypoints_image1": 234,
  "keypoints_image2": 189,
  "match_details": [
    {
      "distance": 0.45,
      "point1": {"x": 125, "y": 89},
      "point2": {"x": 128, "y": 91}
    },
    ...
  ],
  "visualization_base64": "..."
}
```

### `POST /feature-matching/template`
Template Matching dengan multi-scale support.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- template: File (template image, ukuran lebih kecil)
- image: File (target image, ukuran lebih besar)
```

**Response**:
```json
{
  "method": "Template_Matching",
  "description": "Multi-scale template matching untuk deteksi pola recurring",
  "matched_locations": [
    {
      "x": 150,
      "y": 200,
      "scale": 1.0,
      "confidence": 0.92,
      "width": 80,
      "height": 60
    },
    {
      "x": 500,
      "y": 350,
      "scale": 1.25,
      "confidence": 0.88,
      "width": 100,
      "height": 75
    }
  ],
  "total_matches": 5,
  "template_width": 80,
  "template_height": 60,
  "image_width": 1920,
  "image_height": 1080,
  "visualization_base64": "..."
}
```

### `POST /feature-matching/compare-methods`
Bandingkan SIFT vs Template Matching.

**Request**:
```
Content-Type: multipart/form-data

Parameters:
- image1: File (first image)
- image2: File (second image)
```

**Response**:
```json
{
  "comparison": {
    "sift": {
      "method": "SIFT",
      "matched_points": 15,
      "keypoints_img1": 234,
      "keypoints_img2": 189,
      "visualization_base64": "..."
    },
    "template_matching": {
      "method": "Template_Matching",
      "matched_locations": 3,
      "visualization_base64": "..."
    }
  },
  "analysis": {
    "sift_strengths": [
      "Invariant terhadap scale dan rotation",
      "Robust untuk berbagai perspective",
      "Cocok untuk matching complex patterns"
    ],
    "template_strengths": [
      "Lebih cepat untuk pattern yang jelas",
      "Multi-scale support built-in",
      "Sederhana dan reliable untuk exact patterns"
    ]
  }
}
```

---

## 🧪 cURL Examples

### Test Quantization
```bash
curl -X POST http://127.0.0.1:8000/api/v1/quantization/reduce \
  -F "file=@image.jpg" \
  -F "bits_per_channel=4"
```

### Test Noise Addition
```bash
curl -X POST http://127.0.0.1:8000/api/v1/noise/add-salt-pepper \
  -F "file=@image.jpg" \
  -F "probability=0.05"
```

### Test SIFT Matching
```bash
curl -X POST http://127.0.0.1:8000/api/v1/feature-matching/sift \
  -F "image1=@road1.jpg" \
  -F "image2=@road2.jpg" \
  -F "max_matches=20"
```

---

## 📊 Swagger UI
Akses documentation interaktif di:
```
http://127.0.0.1:8000/docs
```

---

**Created**: April 25, 2026
