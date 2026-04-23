import { useState, useEffect } from 'react'
import type { UploadedImageData } from '../../types'

interface StageClusteringProps {
  uploadedImage: UploadedImageData | null
}

export function StageClustering({ uploadedImage }: StageClusteringProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [segments, setSegments] = useState({ normal: 0, damage: 0, line: 0 })
  const [autoProcess, setAutoProcess] = useState(true)

  // Auto-process ketika gambar baru dipilih
  useEffect(() => {
    if (uploadedImage && autoProcess && !isLoading) {
      processImage()
    }
  }, [uploadedImage, autoProcess])

  const processImage = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('k', '3')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/clustering/kmeans', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error("Gagal memproses gambar")
      const data = await response.json()
      
      setResultImage(`data:image/png;base64,${data.segmented_base64}`)
      
      // Mengambil persentase dari backend
      setSegments({
        normal: Math.round(data.percentages.normal || 0),
        damage: Math.round(data.percentages.damage || 0),
        line: Math.round(data.percentages.line || 0)
      })
    } catch (error) {
      console.error(error)
      alert("Gagal menghubungi backend.")
    } finally {
      setIsLoading(false)
    }
  }

  const pie = `conic-gradient(#6b7280 0 ${segments.normal}%, #1d4ed8 ${segments.normal}% ${segments.normal + segments.damage}%, #ffffff ${segments.normal + segments.damage}% 100%)`

  // Determine the damage status
  const getDamageStatus = () => {
    if (segments.damage === 0) return { text: 'Kondisi Baik', color: 'text-green-600' }
    if (segments.damage <= 30) return { text: 'Kerusakan Ringan', color: 'text-yellow-600' }
    if (segments.damage <= 60) return { text: 'Kerusakan Sedang', color: 'text-orange-600' }
    return { text: 'Kerusakan Parah', color: 'text-red-600' }
  }

  const status = getDamageStatus()

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">K-Means Clustering (K = 3)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Segmentasi area jalan dengan Machine Learning Unsupervised.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              <span className="text-slate-700">Auto</span>
            </label>
          </div>
        </div>

        <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-500 font-semibold">Mengelompokkan Pixel...</p>
            </div>
          ) : resultImage ? (
            <img src={resultImage} alt="Clustered Image" className="absolute inset-0 h-full w-full object-contain" />
          ) : uploadedImage ? (
            <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-50" />
          ) : (
            <div className="text-slate-400">Belum ada gambar</div>
          )}
        </div>

        <button
          onClick={processImage}
          disabled={isLoading || !uploadedImage}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-3 w-full text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Sedang Memproses...' : 'Jalankan Segmentasi K-Means'}
        </button>
      </section>

      <aside className="flex flex-col gap-5">
        {/* Pie Chart & Statistics */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-2">Persentase Area</h3>
          
          {resultImage ? (
            <div className="mt-6 flex flex-col items-center gap-6">
              {/* Donut chart */}
              <div className="relative h-32 w-32 rounded-full border shadow-sm border-slate-300" style={{ background: pie }}>
                <div className="absolute inset-6 rounded-full bg-[#eff6ff]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${status.color}`}>
                      {segments.damage}%
                    </div>
                    <div className="text-xs text-slate-600">Rusak</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 w-full text-sm text-slate-700">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white border border-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded bg-gray-500" />
                    Normal
                  </span>
                  <b>{segments.normal}%</b>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white border border-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded bg-blue-700" />
                    Damage
                  </span>
                  <b className="text-blue-700">{segments.damage}%</b>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white border border-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 border rounded border-slate-400 bg-white" />
                    Line
                  </span>
                  <b>{segments.line}%</b>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 p-4 rounded-lg bg-white border border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Klik 'Jalankan Segmentasi' atau aktifkan Auto untuk melihat distribusi area.
              </p>
            </div>
          )}
        </div>

        {/* Status & Recommendation */}
        {resultImage && (
          <div className={`rounded-2xl border-2 p-5 ${
            segments.damage <= 20 ? 'border-green-200 bg-green-50/40' :
            segments.damage <= 40 ? 'border-yellow-200 bg-yellow-50/40' :
            segments.damage <= 60 ? 'border-orange-200 bg-orange-50/40' :
            'border-red-200 bg-red-50/40'
          }`}>
            <h4 className={`text-base font-semibold ${status.color}`}>
              {status.text}
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              {segments.damage <= 20 
                ? '✓ Jalan dalam kondisi baik, lanjutkan pemeliharaan rutin.'
                : segments.damage <= 40
                ? '⚠ Kerusakan ringan terdeteksi, segera lakukan perbaikan.'
                : segments.damage <= 60
                ? '⚠ Kerusakan sedang, prioritas perbaikan tinggi.'
                : '✕ Kerusakan parah, butuh perbaikan mendesak!'}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}