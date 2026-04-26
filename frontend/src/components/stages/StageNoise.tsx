import { useState } from 'react'
import type { UploadedImageData } from '../../types'

// Tambahkan 'median' ke dalam type
type NoiseMethod = 'salt_pepper' | 'gaussian' | 'bilateral' | 'morphology' | 'median' | 'compare'

interface StageNoiseProps {
  uploadedImage: UploadedImageData | null
}

export function StageNoise({ uploadedImage }: StageNoiseProps) {
  const [resultImages, setResultImages] = useState<{ [key: string]: string }>({})
  const [stats, setStats] = useState<{ [key: string]: any }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [activeMethod, setActiveMethod] = useState<NoiseMethod>('salt_pepper')
  
  // Parameter State
  const [saltPepperProb, setSaltPepperProb] = useState<number>(0.05)
  const [gaussianStd, setGaussianStd] = useState<number>(25)
  
  // State baru untuk mengontrol noise apa yang ingin diuji saat mode "Compare"
  const [compareNoiseType, setCompareNoiseType] = useState<'salt_pepper' | 'gaussian'>('salt_pepper')

  const processNoise = async (method: NoiseMethod) => {
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
        case 'salt_pepper':
          endpoint = 'http://127.0.0.1:8000/api/v1/noise/add-salt-pepper'
          formData.append('probability', saltPepperProb.toString())
          break
        case 'gaussian':
          endpoint = 'http://127.0.0.1:8000/api/v1/noise/add-gaussian'
          formData.append('std_dev', gaussianStd.toString())
          break
        case 'bilateral':
          endpoint = 'http://127.0.0.1:8000/api/v1/noise/remove-bilateral'
          break
        case 'morphology':
          endpoint = 'http://127.0.0.1:8000/api/v1/noise/remove-morphology'
          break
        case 'median': // Endpoint Baru
          endpoint = 'http://127.0.0.1:8000/api/v1/noise/remove-median'
          break
        case 'compare':
          endpoint = 'http://127.0.0.1:8000/api/v1/noise/compare'
          // Tidak ada lagi hardcode. Menggunakan pilihan dinamis dari user.
          formData.append('noise_type', compareNoiseType)
          
          // Sesuaikan kalkulasi intensitas berdasarkan jenis noise
          const intensity = compareNoiseType === 'salt_pepper' 
            ? saltPepperProb.toString() 
            : (gaussianStd / 100).toString()
            
          formData.append('noise_intensity', intensity)
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error(`Gagal memproses ${method}`)
      const data = await response.json()
      
      const newResults = { ...resultImages }
      const newStats = { ...stats }
      
      if (data.noisy_image_base64) {
        newResults[method] = `data:image/png;base64,${data.noisy_image_base64}`
      }
      if (data.denoised_image_base64) {
        newResults[method] = `data:image/png;base64,${data.denoised_image_base64}`
      }
      
      // Tangkap semua gambar dari hasil komparasi
      if (data.results) {
        newResults['noisy'] = `data:image/png;base64,${data.results.noisy_image_base64}`
        newResults['bilateral'] = `data:image/png;base64,${data.results.bilateral_filtered_base64}`
        newResults['morphology'] = `data:image/png;base64,${data.results.morphology_filtered_base64}`
        newResults['median'] = `data:image/png;base64,${data.results.median_filtered_base64}` // Tangkap Median
      }
      
      newStats[method] = data.noise_stats || data.filter_stats || data.filter_comparison
      
      setResultImages(newResults)
      setStats(newStats)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMethodLabel = (method: NoiseMethod): string => {
    const labels: { [key in NoiseMethod]: string } = {
      'salt_pepper': 'Salt & Pepper',
      'gaussian': 'Gaussian Noise',
      'bilateral': 'Bilateral Filter',
      'morphology': 'Morphology Filter',
      'median': 'Median Filter',
      'compare': 'Compare Methods'
    }
    return labels[method]
  }

  const showSaltPepperSlider = activeMethod === 'salt_pepper' || (activeMethod === 'compare' && compareNoiseType === 'salt_pepper');
  const showGaussianSlider = activeMethod === 'gaussian' || (activeMethod === 'compare' && compareNoiseType === 'gaussian');
  
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Simulasi & Penghilangan Noise</h2>
          <p className="mt-1 text-sm text-slate-600">
            Demonstrasi pemahaman bentuk data noise dan perbandingan teknik removal yang rasional.
          </p>
        </div>

        {/* Update Grid agar pas untuk 6 tombol */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {(['salt_pepper', 'gaussian', 'bilateral', 'morphology', 'median', 'compare'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setActiveMethod(method)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                activeMethod === method
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {getMethodLabel(method)}
            </button>
          ))}
        </div>

        {/* Dynamic Parameter Controls yang Diperbaiki */}
        <div className="space-y-4 mb-4">
          {showSaltPepperSlider && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Probability: <span className="text-blue-600 font-bold">{(saltPepperProb * 100).toFixed(1)}%</span>
              </label>
              <input
                type="range" min="0.01" max="0.3" step="0.01"
                value={saltPepperProb}
                onChange={(e) => setSaltPepperProb(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}
          {showGaussianSlider && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Standard Deviation: <span className="text-blue-600 font-bold">{gaussianStd.toFixed(1)}</span>
              </label>
              <input
                type="range" min="1" max="100" step="1"
                value={gaussianStd}
                onChange={(e) => setGaussianStd(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Kontrol Khusus untuk Tab Compare */}
        {activeMethod === 'compare' && (
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pilih Skenario Noise untuk Pengujian:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="radio" value="salt_pepper" 
                  checked={compareNoiseType === 'salt_pepper'}
                  onChange={(e) => setCompareNoiseType(e.target.value as any)}
                  className="text-blue-600"
                />
                <span>Salt & Pepper (Prob: {(saltPepperProb * 100).toFixed(1)}%)</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="radio" value="gaussian" 
                  checked={compareNoiseType === 'gaussian'}
                  onChange={(e) => setCompareNoiseType(e.target.value as any)}
                  className="text-blue-600"
                />
                <span>Gaussian (Std Dev: {gaussianStd})</span>
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500 italic">
              *Intensitas noise akan mengambil nilai dari slider pada tab masing-masing noise.
            </p>
          </div>
        )}

        <button
          onClick={() => processNoise(activeMethod)}
          disabled={isLoading || !uploadedImage}
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Memproses Analisis...' : `Proses: ${getMethodLabel(activeMethod)}`}
        </button>
      </section>

      {/* Results Grid - Diubah menjadi 4 kolom (atau 2x2) untuk memuat hasil Compare */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeMethod === 'compare' ? (
          <>
            {resultImages['noisy'] && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">1. Input: Noisy Image</h3>
                <img src={resultImages['noisy']} alt="Noisy" className="w-full rounded-lg shadow-sm" />
              </div>
            )}
            {resultImages['bilateral'] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">2. Bilateral Filter</h3>
                <img src={resultImages['bilateral']} alt="Bilateral" className="w-full rounded-lg shadow-sm" />
              </div>
            )}
            {resultImages['morphology'] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">3. Morphology Filter</h3>
                <img src={resultImages['morphology']} alt="Morphology" className="w-full rounded-lg shadow-sm" />
              </div>
            )}
            {resultImages['median'] && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">4. Median Filter</h3>
                <img src={resultImages['median']} alt="Median" className="w-full rounded-lg shadow-sm" />
              </div>
            )}
          </>
        ) : (
          resultImages[activeMethod] && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 col-span-full md:col-span-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{getMethodLabel(activeMethod)}</h3>
              <img src={resultImages[activeMethod]} alt="Result" className="w-full rounded-lg shadow-sm" />
            </div>
          )
        )}
      </div>

      {Object.keys(resultImages).length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Upload gambar dan klik tombol Proses untuk memulai komparasi</p>
        </div>
      )}
    </div>
  )
}