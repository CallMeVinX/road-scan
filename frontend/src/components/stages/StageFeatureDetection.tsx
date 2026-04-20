import { useState } from 'react'
import type { UploadedImageData } from '../../types'

interface StageFeatureDetectionProps {
  uploadedImage: UploadedImageData | null
}

export function StageFeatureDetection({ uploadedImage }: StageFeatureDetectionProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [stats, setStats] = useState<{ detected: number; returned: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleProcess = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      alert("Harap unggah gambar terlebih dahulu!")
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('threshold_ratio', '0.01')
    formData.append('max_points', '500')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/features/harris', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error("Gagal memproses gambar")
      const data = await response.json()
      setResultImage(`data:image/png;base64,${data.overlay_base64}`)
      setStats({ detected: data.detected_total, returned: data.returned_points })
    } catch (error) {
      console.error(error)
      alert("Gagal menghubungi backend.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Harris Corner Detection</h2>
                <p className="mt-1 text-sm text-slate-600">Mendeteksi titik sudut tajam pada lubang/retakan.</p>
            </div>
            <button
                onClick={handleProcess} disabled={isLoading || !uploadedImage}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? 'Memproses...' : 'Cari Corner'}
            </button>
        </div>

        <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
            {isLoading ? (
                <div className="text-slate-500 font-semibold">Mencari titik sudut...</div>
            ) : resultImage ? (
                <img src={resultImage} alt="Harris Corners" className="absolute inset-0 h-full w-full object-contain" />
            ) : uploadedImage ? (
                <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-50" />
            ) : (
                <div className="text-slate-400">Belum ada gambar</div>
            )}
        </div>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Hasil Deteksi</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <span className="block text-xs text-slate-500 mb-1">Total Corner Terdeteksi</span>
            <span className="font-bold text-lg">{stats ? stats.detected : '-'}</span> titik
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <span className="block text-xs text-slate-500 mb-1">Titik yang Ditampilkan</span>
            <span className="font-bold text-lg text-blue-600">{stats ? stats.returned : '-'}</span> titik
          </div>
          <p className="text-xs text-slate-500 mt-2">*Titik merah digambar langsung oleh server OpenCV.</p>
        </div>
      </aside>
    </div>
  )
}