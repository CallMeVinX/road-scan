import { useState } from 'react'
import type { UploadedImageData } from '../../types'

interface StageConvolutionProps {
  uploadedImage: UploadedImageData | null
}

export function StageConvolution({ uploadedImage }: StageConvolutionProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [kernelMatrix, setKernelMatrix] = useState<number[][]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleProcess = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      alert("Harap unggah gambar terlebih dahulu!")
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/convolution/edge-detection', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error("Gagal memproses gambar")
      const data = await response.json()
      setResultImage(`data:image/png;base64,${data.image_base64}`)
      setKernelMatrix(data.kernel)
    } catch (error) {
      console.error(error)
      alert("Gagal menghubungi backend.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Edge Detection (Live)</h2>
                <p className="mt-1 text-sm text-slate-600">Deteksi tepi retakan menggunakan filter konvolusi 2D.</p>
            </div>
            <button
                onClick={handleProcess} disabled={isLoading || !uploadedImage}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? 'Memproses...' : 'Jalankan Filter'}
            </button>
        </div>

        <div className="mt-5 relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
            {isLoading ? (
                <div className="text-slate-500 font-semibold">Memproses Konvolusi...</div>
            ) : resultImage ? (
                <img src={resultImage} alt="Edge Detection Result" className="absolute inset-0 h-full w-full object-contain bg-black" />
            ) : uploadedImage ? (
                <img src={uploadedImage.url} alt="Original" className="absolute inset-0 h-full w-full object-contain opacity-50" />
            ) : (
                <div className="text-slate-400">Belum ada gambar</div>
            )}
        </div>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Matriks Kernel Aktif</h3>
        {kernelMatrix.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
            {kernelMatrix.flat().map((value, index) => (
                <div key={index} className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm">
                {value}
                </div>
            ))}
            </div>
        ) : (
            <p className="mt-4 text-sm text-slate-500">Klik 'Jalankan Filter' untuk melihat matriks kernel yang digunakan server.</p>
        )}
      </aside>
    </div>
  )
}