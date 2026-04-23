# 🛣️ Road Scan

> **Sistem Deteksi Kerusakan Jalan Berbasis Computer Vision**
> Mendeteksi lubang (pothole), retakan (crack), dan kerusakan permukaan jalan lainnya melalui pipeline pemrosesan citra 6 tahap secara interaktif.

---

## 📋 Deskripsi Proyek

Road Scan adalah aplikasi web full-stack yang mengimplementasikan pipeline Computer Vision untuk analisis kerusakan jalan. Pipeline terdiri dari 6 tahap:

1. **Data Input** — Unggah citra jalan atau pilih gambar sampel
2. **Techniques** — Pra-pemrosesan: grayscale & thresholding
3. **Convolution** — Deteksi tepi menggunakan kernel 3×3 sliding window
4. **Morphology** — Operasi dilation & erosion untuk penguatan struktur retakan
5. **Feature Detection** — Harris corner detection, contour tracking, segmentasi
6. **Unsupervised Learning** — K-Means clustering untuk klasifikasi area kerusakan

---

## 🗂️ Struktur Proyek

```
road-scan/
├── backend/                  # FastAPI + OpenCV
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── routes/       # clustering, convolution, data, features, morphology, techniques
│   │   ├── services/
│   │   │   └── cv_service.py
│   │   ├── utils/
│   │   │   └── image_io.py
│   │   └── static/
│   │       └── placeholders/ # Letakkan gambar sampel di sini
│   ├── main.py
│   └── requirements.txt
│
└── frontend/                 # React + TypeScript + Vite
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.tsx
    │   │   └── stages/       # StageDataInput, StageTechniques, dll.
    │   ├── types.ts
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

---

## ⚙️ Prerequisites

Pastikan tools berikut sudah terinstall sebelum menjalankan proyek:

| Tool | Versi Minimum | Keterangan |
|------|--------------|------------|
| Python | 3.10+ | Runtime backend |
| Node.js | 18+ | Runtime frontend |
| npm | 9+ | Package manager frontend |
| pip | 23+ | Package manager Python |

---

## 🚀 Menjalankan Proyek

### 1. Clone Repository

```bash
git clone https://github.com/<username>/road-scan.git
cd road-scan
```

---

### 2. Setup Backend (FastAPI)

#### a. Buat & Aktifkan Virtual Environment

```bash
cd backend

# Buat virtual environment
python -m venv venv

# Aktifkan (Linux/macOS)
source venv/bin/activate

# Aktifkan (Windows)
venv\Scripts\activate
```

#### b. Install Dependencies

```bash
pip install -r requirements.txt
```

#### c. Siapkan Gambar Sampel *(Opsional)*

Letakkan file gambar (`.jpg`, `.png`, `.jpeg`) ke dalam folder:

```
backend/app/static/placeholders/
```

#### d. Jalankan Server

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Server berjalan di: **http://127.0.0.1:8000**

API Documentation tersedia di: **http://127.0.0.1:8000/docs**

---

### 3. Setup Frontend (React + Vite)

Buka terminal baru (backend tetap berjalan di terminal sebelumnya).

#### a. Install Dependencies

```bash
cd frontend
npm install
```

#### b. Jalankan Development Server

```bash
npm run dev
```

Aplikasi berjalan di: **http://localhost:5173**

---

## 🔗 Konfigurasi API

Frontend secara default terhubung ke `http://127.0.0.1:8000`. Jika backend berjalan di port atau host yang berbeda, ubah semua URL fetch di dalam `frontend/src/components/stages/`.

CORS sudah dikonfigurasi di backend untuk menerima request dari origin lokal. Jika deploy ke server, pastikan `allow_origins` di `main.py` disesuaikan.

---

## 📦 Dependencies Utama

### Backend

| Package | Keterangan |
|---------|------------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `opencv-python` | Computer Vision (grayscale, morphology, Harris, K-Means) |
| `numpy` | Operasi matriks |
| `Pillow` | I/O gambar |
| `python-multipart` | Parsing `multipart/form-data` |
| `scikit-learn` | K-Means clustering |

### Frontend

| Package | Keterangan |
|---------|------------|
| `react` + `typescript` | UI framework |
| `vite` | Build tool & dev server |
| `tailwindcss` | Utility-first CSS |
| `lucide-react` | Icon library |

---

## 🏗️ Build untuk Production

### Backend

Untuk deployment production, ganti `--reload` dengan worker configuration:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend

```bash
cd frontend
npm run build
```

Output build tersimpan di `frontend/dist/`. Serve dengan static file server (Nginx, Caddy, dll.) atau integrasikan dengan backend FastAPI menggunakan `StaticFiles`.

---

## 📡 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/data/metadata` | Ambil metadata gambar |
| `POST` | `/api/v1/data/preprocess` | Preprocessing dasar |
| `GET` | `/api/v1/data/placeholders` | List gambar sampel |
| `POST` | `/api/v1/techniques/preprocess` | Grayscale & thresholding |
| `POST` | `/api/v1/convolution/edge-detection` | Deteksi tepi (Sobel) |
| `POST` | `/api/v1/morphology/transform` | Dilation / Erosion |
| `POST` | `/api/v1/features/harris` | Harris corner detection |
| `POST` | `/api/v1/features/contour` | Contour tracking |
| `POST` | `/api/v1/features/segmentation` | Segmentasi K-Means |
| `POST` | `/api/v1/clustering/kmeans` | K-Means clustering (K=3) |

---

## 🐛 Troubleshooting

**Backend tidak bisa diakses dari frontend**
- Pastikan server FastAPI aktif di port `8000`
- Cek konfigurasi CORS di `main.py`

**`ModuleNotFoundError` saat menjalankan backend**
- Pastikan virtual environment sudah diaktifkan
- Jalankan ulang `pip install -r requirements.txt`

**Gambar sampel tidak muncul**
- Pastikan file gambar ada di `backend/app/static/placeholders/`
- Format yang didukung: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.tiff`, `.webp`

**Frontend gagal build (`npm run build`)**
- Pastikan Node.js versi 18+: `node -v`
- Hapus `node_modules` lalu install ulang: `rm -rf node_modules && npm install`

---

## 📄 Lisensi

MIT License — bebas digunakan untuk keperluan akademik dan non-komersial.
