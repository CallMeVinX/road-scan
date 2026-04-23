import { useState, useEffect, useMemo } from 'react'
import type { UploadedImageData } from '../../types'

interface StageConvolutionProps {
  uploadedImage: UploadedImageData | null
}

export function StageConvolution({ uploadedImage }: StageConvolutionProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [kernelMatrix, setKernelMatrix] = useState<number[][]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [simStep, setSimStep] = useState(0)
  
  // Grid input 6x6 yang akan diisi dengan pixel riil dari gambar
  const [inputGrid, setInputGrid] = useState<number[][]>(
    Array.from({ length: 6 }, () => Array(6).fill(0))
  )

  // 1. Ekstraksi Pixel Asli (Canvas Sampling)
  useEffect(() => {
    if (uploadedImage) {
      const img = new Image()
      img.src = uploadedImage.url
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = 6
          canvas.height = 6
          // Ambil area tengah gambar, perkecil menjadi 6x6 untuk sampel
          ctx.drawImage(img, img.width / 2 - 16, img.height / 2 - 16, 32, 32, 0, 0, 6, 6)
          const imageData = ctx.getImageData(0, 0, 6, 6).data
          
          const grayscaleGrid = []
          for (let i = 0; i < imageData.length; i += 4) {
            // Rumus luminansi Grayscale standar
            const gray = Math.round(
              0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]
            )
            grayscaleGrid.push(gray)
          }
          
          // Ubah array 1D menjadi 2D (6x6)
          const chunked = []
          for (let i = 0; i < 6; i++) {
            chunked.push(grayscaleGrid.slice(i * 6, i * 6 + 6))
          }
          setInputGrid(chunked)
        }
      }
    } else {
      // Reset jika tidak ada gambar
      setInputGrid(Array.from({ length: 6 }, () => Array(6).fill(0)))
    }
  }, [uploadedImage])

  // 2. Logika API Backend
  const handleProcess = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      alert("Harap unggah gambar terlebih dahulu!")
      return
    }

    setIsLoading(true)
    setSimStep(0)
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
      if (data.kernel) setKernelMatrix(data.kernel)
    } catch (error) {
      console.error(error)
      alert("Gagal menghubungi backend. Pastikan server FastAPI berjalan.")
    } finally {
      setIsLoading(false)
    }
  }

  // Visual Kernel Fallback (Sobel Y)
  const visualKernel = kernelMatrix.length > 0 ? kernelMatrix : [
    [-1, -2, -1],
    [ 0,  0,  0],
    [ 1,  2,  1]
  ]

  // 3. Logika Animasi Simulasi (4x4 Output memerlukan 16 langkah)
  const outputSize = 4
  const totalSteps = outputSize * outputSize

  useEffect(() => {
    if (!resultImage) return
    const interval = setInterval(() => {
      setSimStep(prev => (prev + 1) % (totalSteps + 2)) // +2 untuk jeda sejenak sebelum reset
    }, 1200)
    return () => clearInterval(interval)
  }, [resultImage, totalSteps])

  const currentRow = Math.floor(simStep / outputSize)
  const currentCol = simStep % outputSize
  const isCalculating = simStep < totalSteps

  // Kalkulasi Live Formula
  const liveCalculation = useMemo(() => {
    if (!isCalculating) return null
    let sum = 0
    const steps: string[] = []
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const pixelVal = inputGrid[currentRow + i][currentCol + j]
        const kernelVal = visualKernel[i][j]
        sum += pixelVal * kernelVal
        if (kernelVal !== 0) {
          steps.push(`(${pixelVal} × ${kernelVal})`)
        }
      }
    }
    // Normalisasi (mencegah nilai negatif di luar batas visual 0-255)
    const finalVal = Math.min(255, Math.max(0, Math.abs(sum)))
    
    return {
      formula: steps.join(' + '),
      rawSum: sum,
      finalVal: finalVal
    }
  }, [simStep, inputGrid, visualKernel, isCalculating, currentRow, currentCol])


  return (
    <div className="grid gap-6">
      {/* --- BAGIAN 1: PERBANDINGAN GAMBAR --- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analisis Filter Konvolusi</h2>
            <p className="mt-1 text-sm text-slate-600">Deteksi fitur tepi (retakan) menggunakan ekstraksi matriks *sliding window*.</p>
          </div>
          <button
            onClick={handleProcess} 
            disabled={isLoading || !uploadedImage}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto"
          >
            {isLoading ? 'Memproses Matriks...' : 'Jalankan Deteksi Tepi'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input Image */}
          <div className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100/50">
            <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-md">
              INPUT ASLI
            </div>
            <div className="relative h-64 lg:h-72 flex items-center justify-center">
              {uploadedImage ? (
                <img src={uploadedImage.url} alt="Original" className="h-full w-full object-cover" />
              ) : (
                <span className="text-slate-400 text-sm font-medium">Belum ada citra masukan</span>
              )}
            </div>
          </div>

          {/* Result Image */}
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-[#0a0f1a]">
            <div className="absolute top-3 left-3 z-10 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-md shadow-lg">
              HASIL KONVOLUSI
            </div>
            <div className="relative h-64 lg:h-72 flex items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-3"></div>
                  <p className="text-blue-400 text-sm animate-pulse">Menghitung fitur tepi...</p>
                </div>
              ) : resultImage ? (
                <img src={resultImage} alt="Edge Detection Result" className="h-full w-full object-cover" />
              ) : (
                <span className="text-slate-600 text-sm italic">Klik tombol untuk memulai proses</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- BAGIAN 2: SIMULASI MATEMATIKA LIVE --- */}
      {resultImage && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Simulasi Sliding Window (Live)</h3>
              <p className="text-xs text-slate-500">Menggunakan sampel nilai *grayscale* riil dari gambar yang Anda unggah.</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-center justify-center overflow-x-auto pb-4">
            
            {/* 1. Input Matriks */}
            <div className="flex flex-col items-center shrink-0">
              <p className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Piksel Asli (6×6)</p>
              <div className="grid gap-1 p-3 bg-slate-50 border border-slate-200 rounded-xl" style={{ gridTemplateColumns: 'repeat(6, 2.5rem)' }}>
                {inputGrid.map((row, rIdx) => 
                  row.map((val, cIdx) => {
                    const isActive = isCalculating && 
                      rIdx >= currentRow && rIdx < currentRow + 3 && 
                      cIdx >= currentCol && cIdx < currentCol + 3
                    
                    return (
                      <div key={`in-${rIdx}-${cIdx}`}
                        className={`h-10 w-10 flex items-center justify-center text-[11px] font-mono rounded transition-all duration-300 ${
                          isActive 
                            ? 'bg-blue-600 text-white font-bold scale-110 shadow-lg z-10' 
                            : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                      >
                        {val}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="text-2xl text-slate-300 shrink-0">⊗</div>

            {/* 2. Matriks Kernel */}
            <div className="flex flex-col items-center shrink-0">
              <p className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Kernel Tepi (3×3)</p>
              <div className="grid gap-1 p-3 bg-slate-800 rounded-xl" style={{ gridTemplateColumns: 'repeat(3, 2.5rem)' }}>
                {visualKernel.map((row, rIdx) => 
                  row.map((val, cIdx) => (
                    <div key={`k-${rIdx}-${cIdx}`}
                      className={`h-10 w-10 flex items-center justify-center text-xs font-bold rounded border border-slate-700 ${
                        val === 0 ? 'bg-slate-900 text-slate-500' : 
                        val > 0 ? 'bg-blue-900/50 text-blue-400' : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-2xl text-slate-300 shrink-0">→</div>

            {/* 3. Output Matriks */}
            <div className="flex flex-col items-center shrink-0">
              <p className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Piksel Fitur (4×4)</p>
              <div className="grid gap-1 p-3 bg-slate-50 border border-slate-200 rounded-xl" style={{ gridTemplateColumns: 'repeat(4, 2.5rem)' }}>
                {Array.from({ length: outputSize }).map((_, rIdx) => 
                  Array.from({ length: outputSize }).map((_, cIdx) => {
                    const stepIndex = rIdx * outputSize + cIdx
                    const isDone = simStep > stepIndex && isCalculating
                    const isActive = isCalculating && currentRow === rIdx && currentCol === cIdx

                    return (
                      <div key={`out-${rIdx}-${cIdx}`}
                        className={`h-10 w-10 flex items-center justify-center text-[11px] font-mono rounded transition-all duration-300 ${
                          isActive ? 'bg-green-500 text-white font-bold scale-110 shadow-lg' : 
                          isDone ? 'bg-slate-800 text-green-400 font-bold border border-slate-700' : 
                          'bg-transparent text-transparent border border-dashed border-slate-300'
                        }`}
                      >
                        {isDone || isActive ? 'OK' : ''}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            
          </div>

          {/* Kotak Formula Detail */}
          <div className="mt-6 mx-auto max-w-4xl bg-slate-900 rounded-xl p-4 lg:p-5 border border-slate-800 font-mono text-[11px] sm:text-xs">
            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
              <span className="text-slate-400">Terminal Perhitungan</span>
              <span className="text-blue-400">Step: {isCalculating ? simStep + 1 : 'Selesai'}</span>
            </div>
            
            {isCalculating && liveCalculation ? (
              <div className="space-y-2 text-slate-300">
                <p>
                  <span className="text-purple-400">Σ (Piksel × Kernel)</span> = {liveCalculation.formula}
                </p>
                <p>
                  <span className="text-yellow-400">Nilai Mentah</span> = {liveCalculation.rawSum}
                </p>
                <p className="pt-2 border-t border-slate-800/50">
                  <span className="text-green-400 font-bold">Intensitas Piksel Baru (Absolut 0-255) = {liveCalculation.finalVal}</span>
                </p>
              </div>
            ) : (
              <p className="text-slate-500 italic flex items-center h-full min-h-[4rem]">
                <span className="w-2 h-4 bg-slate-500 animate-pulse mr-2 inline-block"></span>
                Siklus konvolusi pada area ini telah selesai. Menunggu rendering hasil akhir...
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}