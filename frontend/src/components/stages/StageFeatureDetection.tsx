import { useState, useEffect } from 'react'
import type { UploadedImageData } from '../../types'

type DetectionMethod = 'harris' | 'edge' | 'threshold' | 'segmentation' | 'contour'

interface StageFeatureDetectionProps {
  uploadedImage: UploadedImageData | null
}

export function StageFeatureDetection({ uploadedImage }: StageFeatureDetectionProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [stats, setStats] = useState<{ 
    detected?: number; 
    returned?: number; 
    regions?: number; 
    contours?: number 
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [thresholdVal, setThresholdVal] = useState<number>(127)
  const [activeMethod, setActiveMethod] = useState<DetectionMethod>('edge')
  const [autoProcess, setAutoProcess] = useState(false)
  const [lastProcessedImageId, setLastProcessedImageId] = useState<string>('')

  // Auto-process HANYA ketika gambar berubah, BUKAN saat isLoading berubah (cegah infinite loop)
  useEffect(() => {
    if (!uploadedImage || !autoProcess) return
    
    const currentImageId = uploadedImage.fileName + uploadedImage.width + uploadedImage.height
    if (currentImageId !== lastProcessedImageId && !isLoading) {
      setLastProcessedImageId(currentImageId)
      processImage(activeMethod)
    }
  }, [uploadedImage?.fileName, uploadedImage?.width, uploadedImage?.height, autoProcess, activeMethod])

  // Fungsi utama untuk pemrosesan
  const processImage = async (method: DetectionMethod) => {
    if (!uploadedImage || !uploadedImage.file) {
      console.warn('No image selected')
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)

    try {
      let endpoint = ''
      
      switch (method) {
        case 'harris':
          endpoint = 'http://127.0.0.1:8000/api/v1/features/harris'
          formData.append('threshold_ratio', '0.01')
          formData.append('max_points', '500')
          break
        case 'edge':
          endpoint = 'http://127.0.0.1:8000/api/v1/convolution/edge-detection'
          break
        case 'threshold':
          endpoint = 'http://127.0.0.1:8000/api/v1/features/threshold'
          formData.append('threshold_val', thresholdVal.toString())
          break
        case 'segmentation':
          endpoint = 'http://127.0.0.1:8000/api/v1/features/segmentation'
          break
        case 'contour':
          endpoint = 'http://127.0.0.1:8000/api/v1/features/contour'
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error(`Gagal memproses ${method}`)
      const data = await response.json()
      
      // Set hasil gambar
      if (data.overlay_base64) {
        setResultImage(`data:image/png;base64,${data.overlay_base64}`)
      } else if (data.image_base64) {
        setResultImage(`data:image/png;base64,${data.image_base64}`)
      }
      
      // Set statistik berdasarkan metode
      if (method === 'harris') {
        setStats({ detected: data.detected_total, returned: data.returned_points })
      } else if (method === 'segmentation') {
        setStats({ regions: data.total_regions })
      } else if (method === 'contour') {
        setStats({ contours: data.total_contours })
      } else {
        setStats({ detected: undefined, returned: undefined, regions: undefined, contours: undefined })
      }
    } catch (error) {
      console.error(`Error processing ${method}:`, error)
      // Jangan tampilkan alert untuk threshold saat slider bergerak
      if (method !== 'threshold') {
        console.error(`Processing failed for ${method}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handler untuk mengubah method
  const handleMethodChange = (newMethod: DetectionMethod) => {
    setActiveMethod(newMethod)
    // Proses otomatis akan dipicu oleh useEffect
  }

  const getMethodLabel = (method: DetectionMethod): string => {
    const labels: { [key in DetectionMethod]: string } = {
      'harris': 'Harris Corner',
      'edge': 'Edge Detection',
      'threshold': 'Thresholding',
      'segmentation': 'Segmentasi',
      'contour': 'Contour Tracking'
    }
    return labels[method]
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      {/* PANEL KIRI: Penampil Citra */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Feature Detection & Segmentation</h2>
            <p className="mt-1 text-sm text-slate-600">Ekstraksi fitur dan segmentasi wilayah kerusakan (Auto-process aktif).</p>
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
            <button
              onClick={() => processImage(activeMethod)}
              disabled={isLoading || !uploadedImage}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Memproses...' : 'Proses Manual'}
            </button>
          </div>
        </div>

        {/* Status Metode Aktif */}
        <div className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          Metode: {getMethodLabel(activeMethod)}
        </div>

        <div className="relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-500 font-semibold">Memproses {getMethodLabel(activeMethod)}...</p>
            </div>
          ) : resultImage ? (
            <img src={resultImage} alt="Result Output" className="absolute inset-0 h-full w-full object-contain" />
          ) : uploadedImage ? (
            <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-50" />
          ) : (
            <div className="text-slate-400">Belum ada gambar</div>
          )}
        </div>
      </section>

      {/* PANEL KANAN: Statistik & Pengaturan Parameter */}
      <aside className="flex flex-col gap-5">
        
        {/* Sub-panel Statistik */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
          <h3 className="text-base font-semibold text-slate-900">Hasil Deteksi</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <span className="block text-xs text-slate-500 mb-1">Total Corner Terdeteksi</span>
              <span className="font-bold text-lg">{stats?.detected ?? '-'}</span> titik
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <span className="block text-xs text-slate-500 mb-1">Wilayah / Kontur</span>
              <span className="font-bold text-lg text-emerald-600">
                {stats?.regions ?? stats?.contours ?? '-'}
              </span> area
            </div>
            <p className="text-xs text-slate-500 mt-2">*Statistik berubah berdasarkan metode aktif.</p>
          </div>
        </div>

        {/* Sub-panel Kontrol Parameter */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Pilih Metode</h3>
          
          {/* Threshold slider (hanya tampil jika thresholding aktif) */}
          {activeMethod === 'threshold' && (
            <div className="mb-5 pb-5 border-b border-slate-200">
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="font-medium text-slate-700">Nilai Threshold:</span>
                <span className="text-blue-600 font-bold">{thresholdVal}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="255" 
                value={thresholdVal} 
                onChange={(e) => {
                  setThresholdVal(parseInt(e.target.value))
                  // Auto-reprocess dengan nilai threshold baru
                  if (autoProcess) {
                    setTimeout(() => processImage('threshold'), 300)
                  }
                }}
                className="w-full accent-blue-600"
              />
            </div>
          )}

          <div className="space-y-2">
            {(['edge', 'harris', 'contour', 'threshold', 'segmentation'] as const).map((method) => (
              <button
                key={method}
                onClick={() => handleMethodChange(method)}
                disabled={isLoading && activeMethod === method}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeMethod === method
                    ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                } disabled:opacity-60`}
              >
                <div className="flex items-center justify-between">
                  <span>{getMethodLabel(method)}</span>
                  {activeMethod === method && isLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  )}
                  {activeMethod === method && !isLoading && (
                    <span className="text-lg">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
            💡 Auto-process otomatis menjalankan deteksi ketika Anda memilih metode atau mengubah parameter.
          </p>
        </div>
      </aside>
    </div>
  )
}