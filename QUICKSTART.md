# 🚀 QUICKSTART - Testing New Features

**Penulis**: Tugas 1 Enhancement Implementation  
**Tanggal**: April 25, 2026  
**Status**: Ready for evaluation ✅

---

## 📋 Prerequisites

- Python 3.10+
- Node.js 18+
- Terminal/Command Prompt

---

## 🏃 Quick Setup (2 Steps)

### Step 1: Start Backend
```bash
cd road-scan/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
✅ Backend running at: `http://127.0.0.1:8000`

### Step 2: Start Frontend
```bash
cd road-scan/frontend
npm install  # hanya jika belum
npm run dev
```
✅ Frontend running at: `http://localhost:5173`

---

## ✨ Test 3 New Features

### 🎯 Fitur 1: QUANTIZATION (RTM Requirement)

**Location**: Frontend → Sidebar → "Quantization"

**Steps**:
1. Upload image (atau gunakan placeholder)
2. Slider untuk select bit depth (1-8)
3. Klik "Terapkan Kuantisasi"
4. Lihat hasil dan statistik

**What to look for**:
- ✅ Gambar berubah ke warna yang lebih terbatas
- ✅ "Quantized Colors" menurun drastis (24-bit → 4-bit)
- ✅ "Compression Ratio" menunjukkan efisiensi
- ✅ Histogram analysis tersedia

**Expected Result**: Demonstrasi jelas bahwa bitrate berkurang, warna lebih limited

---

### 🎯 Fitur 2: NOISE (Sub-CPMK Requirement)

**Location**: Frontend → Sidebar → "Noise Processing"

**Steps**:
1. Upload image
2. Select "Salt & Pepper" tab
3. Adjust probability slider
4. Click "Proses: Salt & Pepper"
5. See noisy result
6. Click "Compare Methods" untuk lihat filtering techniques

**What to look for**:
- ✅ "Salt & Pepper" button → gambar penuh white/black noise
- ✅ Gaussian button → gambar lebih blur tapi continuous
- ✅ "Bilateral Filter" → smooth tapi edge tetap tajam
- ✅ "Morphology Filter" → berguna untuk salt & pepper
- ✅ "Compare Methods" → 3 gambar side-by-side

**Expected Result**: Clear demonstration bahwa app bisa add AND remove berbagai noise types

---

### 🎯 Fitur 3: FEATURE MATCHING (Silabus Requirement)

**Location**: Frontend → Sidebar → "Feature Matching"

**Steps**:
1. Click "Pilih Gambar 1" → Upload image pertama
2. Click "Pilih Gambar 2" → Upload image kedua
3. Select "SIFT Matching" tab
4. Click "Jalankan SIFT Matching"
5. See visualization dengan matching lines

**What to look for**:
- ✅ Keypoints terdeteksi di kedua gambar
- ✅ Matching lines menghubungkan fitur yang cocok
- ✅ "Matched Points" menunjukkan jumlah
- ✅ "Template Matching" juga bisa ditest untuk perbandingan

**Expected Result**: Clear matching visualization antara dua gambar dengan feature descriptors

---

## 🔍 Backend API Testing (Optional)

### Test via Swagger UI
```
http://127.0.0.1:8000/docs
```

### Test via cURL

**Test Quantization**:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/quantization/reduce \
  -F "file=@test_image.jpg" \
  -F "bits_per_channel=4" \
  | jq '.quantization_stats'
```

**Test Noise**:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/noise/add-salt-pepper \
  -F "file=@test_image.jpg" \
  -F "probability=0.1" \
  | jq '.noise_stats'
```

**Test Feature Matching**:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/feature-matching/sift \
  -F "image1=@image1.jpg" \
  -F "image2=@image2.jpg" \
  -F "max_matches=20" \
  | jq '.matched_points'
```

---

## 📊 Evaluasi Checklist

### RTM Requirement: Quantization ✅
- [ ] `StageQuantization` component load tanpa error
- [ ] Slider berfungsi (1-8 bit)
- [ ] Gambar berubah sesuai bit depth
- [ ] Statistics ditampilkan akurat
- [ ] Color reduction terlihat jelas

### Sub-CPMK Requirement: Noise ✅
- [ ] Salt & Pepper noise terlihat (white & black pixels)
- [ ] Gaussian noise terlihat (distributed noise)
- [ ] Bilateral filter preserve edges
- [ ] Morphology filter effective untuk salt & pepper
- [ ] Compare feature menunjukkan 3 hasil

### Silabus Requirement: Feature Matching ✅
- [ ] SIFT matching works antar gambar
- [ ] Keypoints dan descriptors terdeteksi
- [ ] Matching lines visualized dengan benar
- [ ] Template matching juga available
- [ ] Compare methods menunjukkan pros/cons

---

## 📁 Files Modified/Created

```
backend/
├── app/services/cv_service.py          ← +800 lines (11 functions)
├── app/api/routes/
│   ├── quantization.py                 ← NEW (2 endpoints)
│   ├── noise.py                        ← NEW (4 endpoints)
│   └── feature_matching.py             ← NEW (3 endpoints)
└── app/api/router.py                   ← Updated

frontend/
├── src/
│   ├── components/stages/
│   │   ├── StageQuantization.tsx       ← NEW
│   │   ├── StageNoise.tsx              ← NEW
│   │   └── StageFeatureMatching.tsx    ← NEW
│   ├── App.tsx                         ← Updated
│   ├── types.ts                        ← Updated
│   └── components/Sidebar.tsx          ← Updated
```

---

## 🧪 Test Data

Gunakan placeholder images dari backend:
```
http://127.0.0.1:8000/api/v1/data/placeholders
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Ensure dependencies installed
pip install -r backend/requirements.txt

# Check if port 8000 is available
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux
```

### Frontend won't load
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Try different port
npm run dev -- --port 5174
```

### Components not showing
- Check browser console (F12) for errors
- Verify all 3 imports in App.tsx exist
- Ensure new StageId types in types.ts
- Check that rendering conditions match activeStage

---

## 📈 Expected Performance

- Quantization: < 100ms
- Noise Addition: < 500ms (depends on image size)
- Noise Removal: < 1s
- SIFT Matching: 1-3s
- Template Matching: < 1s

---

## ✅ Validation Checklist

| Item | Status |
|------|--------|
| TypeScript compilation | ✅ 0 errors |
| Production build | ✅ Successful |
| Backend startup | ✅ No errors |
| Frontend startup | ✅ No errors |
| Quantization API | ✅ Tested |
| Noise API | ✅ Tested |
| Feature Matching API | ✅ Tested |
| UI Components | ✅ Rendering |
| All 9 stages | ✅ Available |

---

## 📚 Documentation Files

- `IMPLEMENTATION_SUMMARY.md` - Detailed implementation overview
- `API_REFERENCE.md` - Complete API documentation
- `QUICKSTART.md` - This file

---

**Ready to evaluate!** 🎉

Contact: [assessment ready]  
Date: April 25, 2026
