import { useState } from 'react'
import type { UploadedImageData } from '../../types'

interface StageTechniquesProps {
  uploadedImage: UploadedImageData | null
}

export function StageTechniques({ uploadedImage }: StageTechniquesProps) {
  const [grayscale, setGrayscale] = useState(true)
  const [threshold, setThreshold] = useState(false)
  const [thresholdValue, setThresholdValue] = useState(140)
  
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleProcess = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      alert("Harap unggah gambar terlebih dahulu di tahap Data Input!")
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('grayscale', grayscale.toString())
    formData.append('thresholding', threshold.toString())
    formData.append('threshold_value', thresholdValue.toString())

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/techniques/preprocess', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error("Gagal memproses gambar")
      const data = await response.json()
      setResultImage(`data:image/png;base64,${data.image_base64}`)
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
        <h2 className="text-lg font-semibold text-slate-900">Pre-processing (Live Backend)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Menerapkan teknik dasar menggunakan OpenCV.
        </p>

        <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
          {isLoading ? (
             <div className="text-slate-500 font-semibold">Memproses di Backend...</div>
          ) : resultImage ? (
            <img src={resultImage} alt="Processed" className="absolute inset-0 h-full w-full object-contain" />
          ) : uploadedImage ? (
            <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-60" />
          ) : (
            <div className="text-slate-400">Belum ada gambar</div>
          )}
        </div>

        {threshold && (
          <div className="mt-5">
            <label className="text-sm font-semibold text-slate-700">Nilai Threshold: {thresholdValue}</label>
            <input
              type="range" min={0} max={255} value={thresholdValue}
              onChange={(e) => setThresholdValue(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-blue-100 accent-blue-600"
            />
          </div>
        )}
        
        <button
          onClick={handleProcess}
          disabled={isLoading || !uploadedImage}
          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Memproses...' : 'Terapkan Filter'}
        </button>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Kontrol Teknik Dasar</h3>
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setGrayscale(!grayscale)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${grayscale ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}
          >
            <span>Grayscale</span><span>{grayscale ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setThreshold(!threshold)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${threshold ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}
          >
            <span>Thresholding</span><span>{threshold ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </aside>
    </div>
  )
}