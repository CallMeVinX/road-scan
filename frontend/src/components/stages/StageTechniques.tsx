import { useState, useEffect } from 'react'
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
  const [autoProcess, setAutoProcess] = useState(true)

  // Auto-process ketika parameter berubah
  useEffect(() => {
    if (uploadedImage && autoProcess && !isLoading) {
      handleProcess()
    }
  }, [grayscale, threshold, thresholdValue, uploadedImage])

  const handleProcess = async () => {
    if (!uploadedImage || !uploadedImage.file) {
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

  const handleThresholdChange = (value: number) => {
    setThresholdValue(value)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pre-processing (Live Backend)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Menerapkan teknik dasar seperti grayscale dan thresholding menggunakan OpenCV.
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
              <p className="text-slate-500 font-semibold">Memproses di Backend...</p>
            </div>
          ) : resultImage ? (
            <img src={resultImage} alt="Processed" className="absolute inset-0 h-full w-full object-contain" />
          ) : uploadedImage ? (
            <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-60" />
          ) : (
            <div className="text-slate-400">Belum ada gambar</div>
          )}
        </div>

        {threshold && (
          <div className="mt-5 pt-5 border-t border-slate-200">
            <label className="text-sm font-semibold text-slate-700 block mb-2">Nilai Threshold: <span className="text-blue-600 font-bold">{thresholdValue}</span></label>
            <input
              type="range" 
              min={0} 
              max={255} 
              value={thresholdValue}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-blue-100 accent-blue-600"
            />
            <p className="text-xs text-slate-500 mt-2">Geser slider untuk menyesuaikan intensitas threshold (auto-update)</p>
          </div>
        )}
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Kontrol Filter</h3>
        <div className="space-y-3">
          <button
            onClick={() => setGrayscale(!grayscale)}
            disabled={isLoading}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              grayscale 
                ? 'border-blue-600 bg-blue-600 text-white' 
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
            } disabled:opacity-50`}
          >
            <span>Grayscale</span>
            <span className="text-xs px-2 py-1 rounded bg-black/20">{grayscale ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setThreshold(!threshold)}
            disabled={isLoading}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              threshold 
                ? 'border-blue-600 bg-blue-600 text-white' 
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
            } disabled:opacity-50`}
          >
            <span>Thresholding</span>
            <span className="text-xs px-2 py-1 rounded bg-black/20">{threshold ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Info</h4>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex gap-2">
              <span className="text-blue-600">▪</span>
              <span><strong>Grayscale</strong> mengubah gambar ke skala abu-abu untuk menyederhanakan data</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">▪</span>
              <span><strong>Thresholding</strong> mengubah gambar menjadi biner (putih/hitam)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">▪</span>
              <span>Kedua teknik membantu preprocessing sebelum deteksi fitur</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  )
}