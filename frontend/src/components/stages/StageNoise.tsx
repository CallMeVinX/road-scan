import { useState } from 'react'
import type { UploadedImageData } from '../../types'

type NoiseMethod = 'salt_pepper' | 'gaussian' | 'bilateral' | 'morphology' | 'compare'

interface StageNoiseProps {
  uploadedImage: UploadedImageData | null
}

export function StageNoise({ uploadedImage }: StageNoiseProps) {
  const [resultImages, setResultImages] = useState<{ [key: string]: string }>({})
  const [stats, setStats] = useState<{ [key: string]: any }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [activeMethod, setActiveMethod] = useState<NoiseMethod>('salt_pepper')
  const [saltPepperProb, setSaltPepperProb] = useState<number>(0.05)
  const [gaussianStd, setGaussianStd] = useState<number>(25)

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
        case 'compare':
          endpoint = 'http://127.0.0.1:8000/api/v1/noise/compare'
          formData.append('noise_type', 'salt_pepper')
          formData.append('noise_intensity', (saltPepperProb * 2).toString())
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error(`Gagal memproses ${method}`)
      const data = await response.json()
      
      // Set hasil gambar
      const newResults = { ...resultImages }
      const newStats = { ...stats }
      
      if (data.noisy_image_base64) {
        newResults[method] = `data:image/png;base64,${data.noisy_image_base64}`
      }
      if (data.denoised_image_base64) {
        newResults[method] = `data:image/png;base64,${data.denoised_image_base64}`
      }
      if (data.results) {
        newResults['noisy'] = `data:image/png;base64,${data.results.noisy_image_base64}`
        newResults['bilateral'] = `data:image/png;base64,${data.results.bilateral_filtered_base64}`
        newResults['morphology'] = `data:image/png;base64,${data.results.morphology_filtered_base64}`
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
      'compare': 'Compare Methods'
    }
    return labels[method]
  }

  const isAddMethod = ['salt_pepper', 'gaussian'].includes(activeMethod)

  return (
    <div className="grid gap-6">
      {/* Kontrol Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Simulasi & Penghilangan Noise</h2>
          <p className="mt-1 text-sm text-slate-600">
            Demonstrasi pemahaman bentuk data noise (Salt & Pepper, Gaussian) dan teknik removal. Memenuhi sub-CPMK requirement.
          </p>
        </div>

        {/* Method Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {(['salt_pepper', 'gaussian', 'bilateral', 'morphology', 'compare'] as const).map((method) => (
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

        {/* Parameter Controls */}
        {isAddMethod && (
          <div className="space-y-4 mb-4">
            {activeMethod === 'salt_pepper' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Probability: <span className="text-blue-600 font-bold">{(saltPepperProb * 100).toFixed(1)}%</span>
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.3"
                  step="0.01"
                  value={saltPepperProb}
                  onChange={(e) => setSaltPepperProb(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}
            {activeMethod === 'gaussian' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Standard Deviation: <span className="text-blue-600 font-bold">{gaussianStd.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={gaussianStd}
                  onChange={(e) => setGaussianStd(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={() => processNoise(activeMethod)}
          disabled={isLoading || !uploadedImage}
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Memproses...' : `Proses: ${getMethodLabel(activeMethod)}`}
        </button>
      </section>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeMethod === 'compare' ? (
          <>
            {resultImages['noisy'] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Noise Added</h3>
                <img
                  src={resultImages['noisy']}
                  alt="Noisy"
                  className="w-full rounded-lg border border-slate-200"
                />
                <div className="mt-2 text-xs text-slate-600">
                  {stats['compare']?.noise_stats && (
                    <p>Noise: {(stats['compare'].noise_stats.noise_percentage || 0).toFixed(2)}%</p>
                  )}
                </div>
              </div>
            )}
            {resultImages['bilateral'] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Bilateral Filter</h3>
                <img
                  src={resultImages['bilateral']}
                  alt="Bilateral"
                  className="w-full rounded-lg border border-slate-200"
                />
                <div className="mt-2 text-xs text-slate-600">
                  {stats['compare']?.filter_comparison?.bilateral_stats && (
                    <p>Reduction: {(stats['compare'].filter_comparison.bilateral_stats.avg_noise_reduction || 0).toFixed(2)}</p>
                  )}
                </div>
              </div>
            )}
            {resultImages['morphology'] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Morphology Filter</h3>
                <img
                  src={resultImages['morphology']}
                  alt="Morphology"
                  className="w-full rounded-lg border border-slate-200"
                />
                <div className="mt-2 text-xs text-slate-600">
                  {stats['compare']?.filter_comparison?.morphology_stats && (
                    <p>Filter Type: {stats['compare'].filter_comparison.morphology_stats.filter_type}</p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          resultImages[activeMethod] && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 col-span-full md:col-span-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{getMethodLabel(activeMethod)}</h3>
              <img
                src={resultImages[activeMethod]}
                alt="Result"
                className="w-full rounded-lg border border-slate-200"
              />
              {stats[activeMethod] && (
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  {Object.entries(stats[activeMethod]).map(([key, value]: [string, any]) => (
                    <p key={key}>
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value).slice(0, 50)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {Object.keys(resultImages).length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Upload gambar dan klik tombol Proses untuk melihat hasil</p>
        </div>
      )}
    </div>
  )
}
