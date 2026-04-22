# Road Scan Backend (FastAPI)

Backend API untuk prototipe Computer Vision Deteksi Kerusakan Jalan.

## Fitur Endpoint per Tahap

- Data: upload + metadata gambar
- Techniques: grayscale + thresholding
- Convolution: edge detection dengan kernel 3x3
- Morphology: dilation / erosion
- Feature Detection: Harris Corner Detection
- Unsupervised Learning: K-Means clustering

## Menjalankan Project

```bash
py -3.11 -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

## Base URL

- `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

## Endpoint Ringkas

- `POST /api/v1/data/metadata`
- `POST /api/v1/techniques/preprocess`
- `POST /api/v1/convolution/edge-detection`
- `POST /api/v1/morphology/transform`
- `POST /api/v1/features/harris`
- `POST /api/v1/clustering/kmeans`
