import { useState, useEffect } from 'react'
import type { UploadedImageData } from '../../types'

interface BinaryResult {
  is_damaged: boolean
  label: string
  confidence_pct: number
  all_probs: Record<string, number>
}

interface DamageTypeResult {
  predicted_class: string
  confidence_pct: number
  top3: { class: string; confidence_pct: number }[]
  all_probs: Record<string, number>
}

interface PredictResult {
  model_ready: boolean
  binary: BinaryResult | null
  damage_type: DamageTypeResult | null
  gradcam_base64: string | null
  summary: string
  error?: string
}

interface StageClassificationProps {
  uploadedImage: UploadedImageData | null
}

// Warna per kelas kerusakan
const CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Alligator Hole': { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-300'    },
  'Longitudinal':   { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  'Pothole':        { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
  'Transverse':     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
}

const CLASS_DESC: Record<string, string> = {
  'Alligator Hole': 'Retakan pola jaring seperti kulit buaya. Indikasi kegagalan struktural lapisan aspal.',
  'Longitudinal':   'Retakan memanjang sejajar arah lalu lintas. Umumnya akibat kelelahan material.',
  'Pothole':        'Lubang pada permukaan jalan. Berbahaya langsung untuk kendaraan.',
  'Transverse':     'Retakan melintang tegak lurus arah lalu lintas. Sering akibat thermal stress.',
}

export function StageClassification({ uploadedImage }: StageClassificationProps) {
  const [result, setResult]         = useState<PredictResult | null>(null)
  const [isLoading, setIsLoading]   = useState(false)
  const [modelReady, setModelReady] = useState<boolean | null>(null)
  const [autoProcess, setAutoProcess] = useState(false)
  const [showGradcam, setShowGradcam] = useState(true)

  // Cek status model saat mount
  useEffect(() => {
    checkModelStatus()
  }, [])

  // Auto-process
  useEffect(() => {
    if (uploadedImage && autoProcess && modelReady) {
      runClassification()
    }
  }, [uploadedImage])

  const checkModelStatus = async () => {
    try {
      const res  = await fetch('http://127.0.0.1:8000/api/v1/classification/status')
      const data = await res.json()
      setModelReady(data.model_ready)
    } catch {
      setModelReady(false)
    }
  }

  const runClassification = async () => {
    if (!uploadedImage?.file) return
    setIsLoading(true)
    setResult(null)

    const form = new FormData()
    form.append('file', uploadedImage.file)

    try {
      const res  = await fetch('http://127.0.0.1:8000/api/v1/classification/predict', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({
        model_ready: false,
        binary: null,
        damage_type: null,
        gradcam_base64: null,
        summary: 'Gagal menghubungi backend.',
        error: String(e),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const dmgColor = result?.damage_type
    ? CLASS_COLORS[result.damage_type.predicted_class] ?? CLASS_COLORS['Longitudinal']
    : null

  return (
    <div className="grid gap-6">

      {/* ── Header & Controls ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Supervised Learning — Klasifikasi Kerusakan</h2>
            <p className="mt-1 text-sm text-slate-600">
              Model MobileNetV2 dengan transfer learning mendeteksi jenis kerusakan jalan secara otomatis.
            </p>
          </div>

          {/* Model status badge */}
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
            modelReady === true  ? 'bg-green-50 text-green-700 border-green-200'  :
            modelReady === false ? 'bg-red-50 text-red-700 border-red-200'        :
            'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              modelReady === true ? 'bg-green-500' : modelReady === false ? 'bg-red-500' : 'bg-slate-400'
            }`} />
            {modelReady === true ? 'Model Ready' : modelReady === false ? 'Model Belum Ada' : 'Checking...'}
          </div>
        </div>

        {/* Model not ready warning */}
        {modelReady === false && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠ Model belum di-training</p>
            <p>Jalankan perintah berikut dari folder <code className="bg-amber-100 px-1 rounded">backend/</code>:</p>
            <code className="mt-2 block bg-amber-100 rounded p-2 text-xs font-mono">
              python app/ml/training/train.py
            </code>
            <p className="mt-2 text-xs">Pastikan dataset sudah ada di <code className="bg-amber-100 px-1 rounded">backend/app/ml/dataset/</code></p>
            <p className="mt-2 text-xs">Model akan disimpan sebagai <code className="bg-amber-100 px-1 rounded">backend/app/ml/saved_model/multiclass_classifier.pt</code> dan <code className="bg-amber-100 px-1 rounded">backend/app/ml/saved_model/binary_classifier.pt</code></p>
          </div>
        )}

        {/* Input preview + controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-64 flex items-center justify-center">
            <div className="absolute top-3 left-3 z-10 bg-white/90 text-slate-700 border border-slate-200 text-[10px] font-bold tracking-wider px-2 py-1 rounded-md">
              INPUT
            </div>
            {uploadedImage ? (
              <img src={uploadedImage.url} alt="Input" className="h-full w-full object-contain" />
            ) : (
              <p className="text-slate-400 text-sm">Upload gambar di Stage 1</p>
            )}
          </div>

          {/* Grad-CAM result */}
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-64 flex items-center justify-center">
            <div className="absolute top-3 left-3 z-10 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold tracking-wider px-2 py-1 rounded-md">
              GRAD-CAM — AREA KERUSAKAN
            </div>
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="text-xs text-slate-500">Menganalisis...</p>
              </div>
            ) : result?.gradcam_base64 && showGradcam ? (
              <img
                src={`data:image/png;base64,${result.gradcam_base64}`}
                alt="Grad-CAM"
                className="h-full w-full object-contain"
              />
            ) : result && !result.gradcam_base64 ? (
              <p className="text-slate-400 text-xs">Grad-CAM tidak tersedia</p>
            ) : (
              <p className="text-slate-400 text-sm">Hasil Grad-CAM muncul di sini</p>
            )}
          </div>
        </div>

        {/* Grad-CAM legend */}
        {result?.gradcam_base64 && (
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
            <span className="font-semibold">Intensitas heatmap:</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-8 rounded" style={{ background: 'linear-gradient(to right, #00f, #0ff, #0f0, #ff0, #f00)' }} />
              <span>Rendah → Tinggi</span>
            </div>
            <span className="text-red-600">Merah = area paling berpengaruh terhadap prediksi</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-3 items-center">
          <button
            onClick={runClassification}
            disabled={isLoading || !uploadedImage || !modelReady}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Mengklasifikasi...' : 'Jalankan Klasifikasi'}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoProcess}
              onChange={e => setAutoProcess(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            Auto
          </label>
          {result?.gradcam_base64 && (
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showGradcam}
                onChange={e => setShowGradcam(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              Tampilkan Grad-CAM
            </label>
          )}
        </div>
      </section>

      {/* ── Hasil Klasifikasi ──────────────────────────────────────────── */}
      {result && result.model_ready && result.binary && (
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Binary result */}
          <div className={`rounded-2xl border-2 p-5 ${
            result.binary.is_damaged
              ? 'border-red-300 bg-red-50'
              : 'border-green-300 bg-green-50'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">
                {result.binary.is_damaged ? '🚨' : '✅'}
              </span>
              <div>
                <p className={`text-xl font-bold ${
                  result.binary.is_damaged ? 'text-red-700' : 'text-green-700'
                }`}>
                  {result.binary.is_damaged ? 'JALAN RUSAK' : 'JALAN NORMAL'}
                </p>
                <p className="text-sm text-slate-600">
                  Confidence: <span className="font-bold">{result.binary.confidence_pct.toFixed(1)}%</span>
                </p>
              </div>
            </div>

            {/* Probability bars */}
            <div className="space-y-2">
              {Object.entries(result.binary.all_probs).map(([cls, prob]) => (
                <div key={cls}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize font-medium text-slate-700">{cls.replace('_', ' ')}</span>
                    <span className="font-bold">{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        cls === 'rusak' ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${prob * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Damage type result (hanya jika rusak) */}
          {result.binary.is_damaged && result.damage_type ? (
            <div className={`rounded-2xl border-2 p-5 ${
              dmgColor ? `${dmgColor.bg} ${dmgColor.border}` : 'border-slate-200 bg-slate-50'
            }`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Jenis Kerusakan Terdeteksi
              </p>

              <div className={`inline-block rounded-xl px-4 py-2 text-lg font-bold mb-3 ${
                dmgColor ? `${dmgColor.bg} ${dmgColor.text}` : ''
              }`}>
                {result.damage_type.predicted_class}
              </div>

              <p className="text-sm text-slate-600 mb-4">
                {CLASS_DESC[result.damage_type.predicted_class] ?? ''}
              </p>

              {/* Top-3 bars */}
              <div className="space-y-2">
                {result.damage_type.top3.map((item, idx) => {
                  const c = CLASS_COLORS[item.class]
                  return (
                    <div key={item.class}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`font-medium ${idx === 0 ? 'font-bold' : 'text-slate-600'}`}>
                          {idx === 0 ? '🏆 ' : ''}{item.class}
                        </span>
                        <span className="font-bold">{item.confidence_pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            idx === 0 ? (c?.text.replace('text', 'bg') ?? 'bg-red-500') : 'bg-slate-400'
                          }`}
                          style={{ width: `${item.confidence_pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : result.binary.is_damaged && !result.damage_type ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-center justify-center">
              <p className="text-slate-500 text-sm">Gagal mendapatkan jenis kerusakan</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="font-semibold text-green-700 mb-2">✓ Tidak ada kerusakan terdeteksi</p>
              <p className="text-sm text-slate-600">
                Permukaan jalan tampak dalam kondisi baik. Lanjutkan pemantauan berkala.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary box */}
      {result?.summary && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span className="font-semibold">Ringkasan: </span>{result.summary}
        </div>
      )}

      {/* Empty state */}
      {!result && !isLoading && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400 text-sm">
            Upload gambar dan klik "Jalankan Klasifikasi" untuk melihat hasil deteksi
          </p>
        </div>
      )}
    </div>
  )
}