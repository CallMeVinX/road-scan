import { useState } from 'react'
import type { UploadedImageData } from '../../types'

interface StageClusteringProps {
  uploadedImage: UploadedImageData | null
}

export function StageClustering({ uploadedImage }: StageClusteringProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [segments, setSegments] = useState({ normal: 0, damage: 0, line: 0 })

  const handleProcess = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      alert("Harap unggah gambar terlebih dahulu!")
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">K-Means Clustering (K = 3)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Segmentasi area menggunakan Machine Learning Unsupervised.
        </p>

        <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
            {isLoading ? (
                <div className="text-slate-500 font-semibold">Mengelompokkan Pixel...</div>
            ) : resultImage ? (
                <img src={resultImage} alt="Clustered Image" className="absolute inset-0 h-full w-full object-contain" />
            ) : uploadedImage ? (
                <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-50" />
            ) : (
                <div className="text-slate-400">Belum ada gambar</div>
            )}
        </div>

        <button
          onClick={handleProcess} disabled={isLoading || !uploadedImage}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-3 w-full text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Sedang Memproses...' : 'Jalankan Segmentasi K-Means'}
        </button>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Persentase Area (Live)</h3>
        {resultImage ? (
             <div className="mt-6 flex flex-col items-center gap-6">
                <div className="relative h-32 w-32 rounded-full border shadow-sm border-slate-300" style={{ background: pie }}>
                    <div className="absolute inset-6 rounded-full bg-[#eff6ff]" />
                </div>
                <div className="space-y-3 w-full text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    <p className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded bg-gray-500" /> Normal</span> <b>{segments.normal}%</b></p>
                    <p className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded bg-blue-700" /> Damage</span> <b>{segments.damage}%</b></p>
                    <p className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="inline-block h-3 w-3 border rounded border-slate-400 bg-white" /> Line</span> <b>{segments.line}%</b></p>
                </div>
            </div>
        ) : (
            <p className="mt-4 text-sm text-slate-500">Klik tombol segmentasi untuk melihat distribusi area jalan dan kerusakannya.</p>
        )}
      </aside>
    </div>
  )
}