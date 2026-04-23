import { useState, useEffect } from 'react'
import type { UploadedImageData } from '../../types'

interface StageConvolutionProps {
  uploadedImage: UploadedImageData | null
}

export function StageConvolution({ uploadedImage }: StageConvolutionProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [kernelMatrix, setKernelMatrix] = useState<number[][]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)

  // Mulai animasi ketika result image ada
  useEffect(() => {
    if (!resultImage) return
    
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 5)
    }, 800)
    
    return () => clearInterval(interval)
  }, [resultImage])

  const handleProcess = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      alert("Harap unggah gambar terlebih dahulu!")
      return
    }

    setIsLoading(true)
    setAnimationStep(0)
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

  // Default kernel untuk visualisasi sebelum processing
  const visualKernel = kernelMatrix.length > 0 ? kernelMatrix : [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ]

  const maxKernelValue = Math.max(...visualKernel.flat().map(Math.abs))
  const minKernelValue = Math.min(...visualKernel.flat())

  const getNormalizedColor = (value: number) => {
    const normalized = (value - minKernelValue) / (maxKernelValue - minKernelValue)
    if (value > 0) {
      return `rgba(59, 130, 246, ${Math.max(0.3, normalized)})`
    } else if (value < 0) {
      return `rgba(239, 68, 68, ${Math.max(0.3, Math.abs(normalized))})`
    } else {
      return 'rgba(100, 116, 139, 0.2)'
    }
  }

  // Simulasi grid 4x4 dengan kernel 3x3 yang bergerak
  const getInputWindow = (step: number) => {
    // Posisi awal kernel, bergerak step-by-step
    const positions = [
      [0, 0], [1, 0], [0, 1], [1, 1], [0, 0]
    ]
    return positions[step % positions.length]
  }

  const kernelPos = getInputWindow(animationStep)

  return (
    <div className="grid gap-6">
      {/* Main Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Konvolusi Edge Detection (Live)</h2>
            <p className="mt-1 text-sm text-slate-600">Deteksi tepi retakan menggunakan filter konvolusi 2D.</p>
          </div>
          <button
            onClick={handleProcess} disabled={isLoading || !uploadedImage}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Memproses...' : 'Jalankan Filter'}
          </button>
        </div>

        {/* Before-After Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Original Image */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 border-b border-slate-200">
              Input Original
            </div>
            <div className="relative h-64 lg:h-80 flex items-center justify-center overflow-hidden bg-black">
              {uploadedImage ? (
                <img src={uploadedImage.url} alt="Original" className="h-full w-full object-contain opacity-90" />
              ) : (
                <div className="text-slate-400 text-sm">Belum ada gambar</div>
              )}
            </div>
          </div>

          {/* Result Image */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 border-b border-slate-200">
              Output Edge Detection
            </div>
            <div className="relative h-64 lg:h-80 flex items-center justify-center overflow-hidden bg-black">
              {isLoading ? (
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent mb-2"></div>
                  <p className="text-slate-400">Memproses...</p>
                </div>
              ) : resultImage ? (
                <img src={resultImage} alt="Edge Detection" className="h-full w-full object-contain" />
              ) : uploadedImage ? (
                <img src={uploadedImage.url} alt="Original" className="h-full w-full object-contain opacity-40" />
              ) : (
                <div className="text-slate-400 text-sm">Hasil akan tampil di sini</div>
              )}
            </div>
          </div>
        </div>

        {/* Kernel Animation Visualization */}
        {resultImage && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Visualisasi Kernel Bergerak (3×3)</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Input Window */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Input Window (4×4 Grid)</p>
                <div className="inline-grid gap-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {Array(16).fill(0).map((_, idx) => {
                    const row = Math.floor(idx / 4)
                    const col = idx % 4
                    const isInKernel = 
                      row >= kernelPos[0] && row < kernelPos[0] + 3 &&
                      col >= kernelPos[1] && col < kernelPos[1] + 3
                    
                    return (
                      <div
                        key={idx}
                        className={`w-10 h-10 flex items-center justify-center text-xs font-semibold rounded border-2 ${
                          isInKernel
                            ? 'border-green-500 bg-green-100 text-green-900'
                            : 'border-slate-300 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {Math.floor(Math.random() * 255)}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2">Kotak hijau = kernel aktif</p>
              </div>

              {/* Kernel Matrix */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Kernel Filter (3×3)</p>
                <div className="inline-grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {visualKernel.map((row, rowIdx) =>
                    row.map((value, colIdx) => (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className="w-12 h-12 flex items-center justify-center text-xs font-bold rounded border-2 border-slate-300"
                        style={{ backgroundColor: getNormalizedColor(value) }}
                      >
                        {value}
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  <span className="inline-block w-2.5 h-2.5 bg-blue-400 rounded mr-1"></span>
                  Biru (positif) | 
                  <span className="inline-block w-2.5 h-2.5 bg-red-400 rounded mx-1"></span>
                  Merah (negatif)
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700">
              <strong>Step {animationStep + 1}:</strong> Kernel bergerak melintasi input, setiap elemen dikalikan kemudian dijumlahkan menjadi 1 output pixel.
            </div>
          </div>
        )}
      </section>

      {/* Explanation Panel */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Cara Kerja Konvolusi 2D</h3>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
            <span>Kernel 3×3 diposisikan di atas bagian 3×3 dari input image</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
            <span>Setiap nilai kernel dikalikan dengan nilai pixel yang sesuai</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
            <span>Hasil perkalian dijumlahkan untuk mendapatkan 1 output pixel</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</span>
            <span>Kernel bergeser (stride=1) dan proses diulang untuk seluruh image</span>
          </li>
        </ol>
      </aside>
    </div>
  )
}
