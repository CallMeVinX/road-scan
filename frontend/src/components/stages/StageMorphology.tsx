import { useState } from 'react'
import type { UploadedImageData } from '../../types'

type MorphMode = 'dilation' | 'erosion'

interface StageMorphologyProps {
  uploadedImage: UploadedImageData | null
}

export function StageMorphology({ uploadedImage }: StageMorphologyProps) {
  const [mode, setMode] = useState<MorphMode>('dilation')
  const [kernelSize, setKernelSize] = useState<number>(3) // STATE BARU UNTUK KERNEL
  
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleProcess = async (selectedMode: MorphMode = mode) => {
    setMode(selectedMode)
    
    if (!uploadedImage || !uploadedImage.file) {
      alert("Harap unggah gambar terlebih dahulu di tahap Data Input!")
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('operation', selectedMode)
    formData.append('iterations', '1')
    formData.append('kernel_size', kernelSize.toString()) // KIRIM KERNEL KE BACKEND

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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Operasi Morfologi (Live)</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Deteksi tepi Canny dilanjutkan dengan Dilasi/Erosi OpenCV.
                </p>
            </div>
            {/* Tombol Eksekusi Cepat */}
            <button
                onClick={() => handleProcess(mode)} disabled={isLoading || !uploadedImage}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? 'Memproses...' : 'Terapkan'}
            </button>
        </div>

        <div className="mt-5 relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
          {isLoading ? (
            <div className="text-slate-500 font-semibold">Memproses di Backend...</div>
          ) : resultImage ? (
            <img src={resultImage} alt="Result from API" className="absolute inset-0 h-full w-full object-contain bg-black" />
          ) : uploadedImage ? (
            <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-50" />
          ) : (
            <div className="text-slate-400">Belum ada gambar</div>
          )}

          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
            Mode: {mode === 'dilation' ? 'Dilation' : 'Erosion'} | Stel: {kernelSize}x{kernelSize}
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Pengaturan Parameter</h3>

        {/* --- KONTROL BARU UNTUK UKURAN STEL --- */}
        <div className="mt-5 mb-6">
          <label className="text-sm font-semibold text-slate-700 flex justify-between">
            <span>Ukuran Stel (Kernel):</span>
            <span className="text-blue-700">{kernelSize} x {kernelSize}</span>
          </label>
          <input
            type="range"
            min="1"
            max="15"
            step="2" // Step 2 agar nilainya selalu ganjil (1, 3, 5, 7...)
            value={kernelSize}
            onChange={(e) => setKernelSize(Number(e.target.value))}
            className="mt-3 w-full h-2 cursor-pointer appearance-none rounded-lg bg-blue-200 accent-blue-600"
          />
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Semakin besar nilai ganjil, semakin ekstrem pelebaran atau pengikisannya.
          </p>
        </div>

        <hr className="my-4 border-blue-200" />

        <div className="space-y-3">
          <button
            onClick={() => handleProcess('dilation')}
            disabled={isLoading}
            className={`w-full rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
              mode === 'dilation' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
            }`}
          >
            Dilation
          </button>

          <button
            onClick={() => handleProcess('erosion')}
            disabled={isLoading}
            className={`w-full rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
              mode === 'erosion' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
            }`}
          >
            Erosion
          </button>
        </div>
      </aside>
    </div>
  )
}