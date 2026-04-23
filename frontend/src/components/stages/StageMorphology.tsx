import { useState, useEffect } from 'react'
import type { UploadedImageData } from '../../types'

type MorphMode = 'dilation' | 'erosion'

interface StageMorphologyProps {
  uploadedImage: UploadedImageData | null
}

export function StageMorphology({ uploadedImage }: StageMorphologyProps) {
  const [mode, setMode] = useState<MorphMode>('dilation')
  const [kernelSize, setKernelSize] = useState<number>(3)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [autoProcess, setAutoProcess] = useState(true)

  // Auto-process ketika parameter berubah
  useEffect(() => {
    if (uploadedImage && autoProcess && !isLoading) {
      processImage(mode)
    }
  }, [uploadedImage, mode, kernelSize, autoProcess])

  const processImage = async (selectedMode: MorphMode = mode) => {
    setMode(selectedMode)
    
    if (!uploadedImage || !uploadedImage.file) {
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('operation', selectedMode)
    formData.append('iterations', '1')
    formData.append('kernel_size', kernelSize.toString())

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/morphology/transform', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error("Gagal memproses gambar")
      
      const data = await response.json()
      setResultImage(`data:image/png;base64,${data.mask_base64}`)
      
    } catch (error) {
      console.error(error)
      alert("Gagal menghubungi backend.")
    } finally {
      setIsLoading(false)
    }
  }

  const getModeDescription = (m: MorphMode): string => {
    return m === 'dilation' 
      ? 'Pelebaran - menambah area putih, memperluas struktur positif'
      : 'Pengikisan - mengurangi area putih, mengecilkan struktur positif'
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Operasi Morfologi (Live)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pelebaran (dilation) dan pengikisan (erosion) untuk memperkuat/melemahkan struktur tepi.
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

        {/* Mode Active Badge */}
        <div className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          Metode: {mode === 'dilation' ? 'Pelebaran' : 'Pengikisan'} ({kernelSize}×{kernelSize})
        </div>

        <div className="mt-5 relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-500 font-semibold">Memproses {mode === 'dilation' ? 'Dilation' : 'Erosion'}...</p>
            </div>
          ) : resultImage ? (
            <img src={resultImage} alt="Result from API" className="absolute inset-0 h-full w-full object-contain bg-black" />
          ) : uploadedImage ? (
            <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-50" />
          ) : (
            <div className="text-slate-400">Belum ada gambar</div>
          )}

          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
            {mode === 'dilation' ? '⊕ Dilation' : '⊖ Erosion'} | Kernel: {kernelSize}×{kernelSize}
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Pengaturan Parameter</h3>

        {/* Kernel Size Slider */}
        <div className="mb-6 pb-6 border-b border-blue-200">
          <label className="text-sm font-semibold text-slate-700 flex justify-between mb-2">
            <span>Ukuran Kernel:</span>
            <span className="text-blue-700 font-bold">{kernelSize}×{kernelSize}</span>
          </label>
          <input
            type="range"
            min="1"
            max="15"
            step="2"
            value={kernelSize}
            onChange={(e) => setKernelSize(Number(e.target.value))}
            disabled={isLoading}
            className="mt-3 w-full h-2 cursor-pointer appearance-none rounded-lg bg-blue-200 accent-blue-600 disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Nilai ganjil (1, 3, 5, 7...). Semakin besar, semakin ekstrem efeknya.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3 mb-5">
          <button
            onClick={() => processImage('dilation')}
            disabled={isLoading}
            className={`w-full rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
              mode === 'dilation' 
                ? 'border-blue-600 bg-blue-600 text-white shadow-md' 
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
            } disabled:opacity-60`}
          >
            <div className="flex items-center justify-between">
              <span>⊕ Dilation</span>
              {mode === 'dilation' && (
                <span className="text-sm">Aktif</span>
              )}
            </div>
          </button>

          <button
            onClick={() => processImage('erosion')}
            disabled={isLoading}
            className={`w-full rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
              mode === 'erosion' 
                ? 'border-blue-600 bg-blue-600 text-white shadow-md' 
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
            } disabled:opacity-60`}
          >
            <div className="flex items-center justify-between">
              <span>⊖ Erosion</span>
              {mode === 'erosion' && (
                <span className="text-sm">Aktif</span>
              )}
            </div>
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-white/50 rounded-lg p-3 border border-blue-100">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            {mode === 'dilation' ? '⊕ Pelebaran' : '⊖ Pengikisan'}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {getModeDescription(mode)}
          </p>
        </div>
      </aside>
    </div>
  )
}