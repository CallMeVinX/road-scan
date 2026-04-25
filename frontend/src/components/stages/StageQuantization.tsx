import { useState } from 'react'
import type { UploadedImageData } from '../../types'

interface StageQuantizationProps {
  uploadedImage: UploadedImageData | null
}

export function StageQuantization({ uploadedImage }: StageQuantizationProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bitsPerChannel, setBitsPerChannel] = useState<number>(4)
  const [colorAnalysis, setColorAnalysis] = useState<any>(null)

  const processQuantization = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      console.warn('No image selected')
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('bits_per_channel', bitsPerChannel.toString())

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/quantization/reduce', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error('Gagal melakukan kuantisasi')
      const data = await response.json()
      
      setResultImage(`data:image/png;base64,${data.quantized_base64}`)
      setStats(data.quantization_stats)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeColors = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      console.warn('No image selected')
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/quantization/levels', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error('Gagal menganalisis level warna')
      const data = await response.json()
      
      setColorAnalysis(data.color_analysis)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getBitDepthLabel = (bits: number): string => {
    const labels: { [key: number]: string } = {
      1: '3-bit (8 warna)',
      2: '6-bit (64 warna)',
      4: '12-bit (4K warna)',
      8: '24-bit (16.7M warna - standar)'
    }
    return labels[bits] || `${bits}-bit`
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      {/* PANEL KIRI: Visualisasi */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Kuantisasi Warna</h2>
          <p className="mt-1 text-sm text-slate-600">
            Demonstrasi pengurangan kedalaman bit per channel. Memenuhi RTM requirement untuk Quantization.
          </p>
        </div>

        <div className="space-y-4">
          {/* Slider untuk Bit Depth */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bit Per Channel: <span className="font-bold text-blue-600">{getBitDepthLabel(bitsPerChannel)}</span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              value={bitsPerChannel}
              onChange={(e) => setBitsPerChannel(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1 (minimal)</span>
              <span>8 (standar)</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={processQuantization}
              disabled={isLoading || !uploadedImage}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Kuantisasi...' : 'Terapkan Kuantisasi'}
            </button>
            <button
              onClick={analyzeColors}
              disabled={isLoading || !uploadedImage}
              className="flex-1 rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-300 disabled:opacity-50"
            >
              Analisis Level Warna
            </button>
          </div>
        </div>

        {/* Hasil Gambar */}
        {resultImage && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Hasil Kuantisasi ({bitsPerChannel}-bit)</h3>
            <img
              src={resultImage}
              alt="Quantized result"
              className="w-full rounded-xl border border-slate-200"
            />
          </div>
        )}
      </section>

      {/* PANEL KANAN: Statistik */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 h-fit">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Statistik</h3>

        {stats && (
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-slate-600">Original Colors</p>
              <p className="text-lg font-bold text-blue-600">
                {(stats.original_unique_colors || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-slate-600">Quantized Colors</p>
              <p className="text-lg font-bold text-green-600">
                {(stats.quantized_unique_colors || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-slate-600">Compression Ratio</p>
              <p className="text-lg font-bold text-purple-600">
                {(stats.compression_ratio || 1).toFixed(2)}x
              </p>
            </div>

            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-slate-600">Color Reduction</p>
              <p className="text-lg font-bold text-orange-600">
                {(stats.color_reduction_percent || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {colorAnalysis && (
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-600">Unique Colors</p>
              <p className="text-lg font-bold text-slate-900">
                {(colorAnalysis.unique_colors || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-600">Color Diversity</p>
              <p className="text-lg font-bold text-slate-900">
                {(colorAnalysis.color_diversity_percent || 0).toFixed(4)}%
              </p>
            </div>

            <div className="text-xs text-slate-500 mt-4">
              <p>Resolution: {colorAnalysis.width} × {colorAnalysis.height}</p>
              <p>Total Pixels: {(colorAnalysis.total_pixels || 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        {!stats && !colorAnalysis && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Klik tombol di atas untuk melihat statistik</p>
          </div>
        )}
      </section>
    </div>
  )
}
