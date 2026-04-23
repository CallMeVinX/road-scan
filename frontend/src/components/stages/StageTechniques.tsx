import { useState } from 'react'
import { Settings2, Zap } from 'lucide-react'
import type { UploadedImageData } from '../../types'

interface StageTechniquesProps {
  uploadedImage: UploadedImageData | null
}

export function StageTechniques({ uploadedImage }: StageTechniquesProps) {
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTechnique, setActiveTechnique] = useState('threshold')

  const techniques = [
    { id: 'threshold', name: 'Binary Thresholding', desc: 'Memisahkan objek dari latar belakang berdasarkan intensitas cahaya.' },
    { id: 'adaptive', name: 'Adaptive Mean', desc: 'Thresholding lokal untuk mengatasi pencahayaan yang tidak merata.' },
    { id: 'blur', name: 'Gaussian Blur', desc: 'Menghaluskan citra untuk mengurangi noise pada tekstur aspal.' }
  ]

  const handleProcess = async () => {
    if (!uploadedImage?.file) return
    setIsLoading(true)
    
    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('method', activeTechnique)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/techniques/apply', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error("Gagal memproses teknik")
      const data = await response.json()
      setResultImage(`data:image/png;base64,${data.image_base64}`)
    } catch (error) {
      console.error(error)
      alert("Gagal menghubungi backend.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      {/* Configuration & Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Digital Image Processing</h2>
              <p className="text-sm text-slate-500">Pilih teknik pemrosesan untuk meningkatkan visualisasi kerusakan.</p>
            </div>
          </div>
          <button
            onClick={handleProcess}
            disabled={isLoading || !uploadedImage}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-sm w-full sm:w-auto"
          >
            <Zap size={16} />
            {isLoading ? 'Memproses...' : 'Terapkan Teknik'}
          </button>
        </div>

        {/* Technique Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {techniques.map((tech) => (
            <button
              key={tech.id}
              onClick={() => setActiveTechnique(tech.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                activeTechnique === tech.id
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <h4 className={`font-bold text-sm ${activeTechnique === tech.id ? 'text-blue-700' : 'text-slate-900'}`}>
                {tech.name}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tech.desc}</p>
            </button>
          ))}
        </div>

        {/* Image Comparison - Light Theme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input Panel */}
          <div className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            <div className="absolute top-3 left-3 z-10 bg-white/90 text-slate-700 border border-slate-200 text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-md shadow-sm">
              ORIGINAL IMAGE
            </div>
            <div className="relative h-64 lg:h-80 flex items-center justify-center p-2">
              {uploadedImage ? (
                <img src={uploadedImage.url} alt="Original" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <span className="text-slate-400 text-sm italic">Belum ada citra</span>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            <div className="absolute top-3 left-3 z-10 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-md shadow-sm uppercase">
              {activeTechnique} Result
            </div>
            <div className="relative h-64 lg:h-80 flex items-center justify-center p-2">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3"></div>
                  <p className="text-blue-600 text-sm font-medium">Memproses filter...</p>
                </div>
              ) : resultImage ? (
                <img src={resultImage} alt="Technique Result" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <span className="text-slate-500 text-sm italic">Hasil akan muncul di sini</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}