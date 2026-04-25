import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Aperture,
  Binary,
  Database,
  Layers,
  ScanSearch,
  Sparkles,
  BarChart3,
  Zap,
  Wind,
  Link2,
} from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { StageClustering } from './components/stages/StageClustering'
import { StageConvolution } from './components/stages/StageConvolution'
import { StageDataInput } from './components/stages/StageDataInput'
import { StageFeatureDetection } from './components/stages/StageFeatureDetection'
import { StageMorphology } from './components/stages/StageMorphology'
import { StageTechniques } from './components/stages/StageTechniques'
import { StagePavementDamageAnalysis } from './components/stages/StagePavementDamageAnalysis'
import { StageQuantization } from './components/stages/StageQuantization'
import { StageNoise } from './components/stages/StageNoise'
import { StageFeatureMatching } from './components/stages/StageFeatureMatching'
import type { StageId, UploadedImageData } from './types'

function App() {
  const [activeStage, setActiveStage] = useState<StageId>('data')
  const [uploadedImage, setUploadedImage] = useState<UploadedImageData | null>(null)

  const handleImageSelected = useCallback((image: UploadedImageData) => {
    setUploadedImage((previous) => {
      if (previous?.url) {
        URL.revokeObjectURL(previous.url)
      }
      return image
    })
  }, [])

  useEffect(() => {
    return () => {
      if (uploadedImage?.url) {
        URL.revokeObjectURL(uploadedImage.url)
      }
    }
  }, [uploadedImage])

  const stages = useMemo(
    () => [
      {
        id: 'data' as const,
        title: 'Data (Input)',
        description: 'Unggah citra jalan rusak dan baca metadata.',
        icon: Database,
      },
      {
        id: 'techniques' as const,
        title: 'Techniques',
        description: 'Pra-pemrosesan: grayscale dan thresholding.',
        icon: Sparkles,
      },
      {
        id: 'convolution' as const,
        title: 'Convolution',
        description: 'Kernel 3x3 sliding window untuk edge detection.',
        icon: Binary,
      },
      {
        id: 'morphology' as const,
        title: 'Morphology',
        description: 'Dilation dan erosion untuk struktur retakan.',
        icon: Layers,
      },
      {
        id: 'feature-detection' as const,
        title: 'Feature Detection',
        description: 'Simulasi Harris corner detection pada pothole.',
        icon: ScanSearch,
      },
      {
        id: 'clustering' as const,
        title: 'Unsupervised Learning',
        description: 'K-means clustering area kerusakan jalan.',
        icon: Aperture,
      },
      {
        id: 'quantization' as const,
        title: 'Quantization',
        description: 'Kuantisasi warna: Pengurangan kedalaman bit per channel.',
        icon: Zap,
      },
      {
        id: 'noise' as const,
        title: 'Noise Processing',
        description: 'Simulasi dan penghilangan Salt & Pepper, Gaussian noise.',
        icon: Wind,
      },
      {
        id: 'feature-matching' as const,
        title: 'Feature Matching',
        description: 'Pencocokan fitur antar gambar menggunakan SIFT atau Template Matching.',
        icon: Link2,
      },
      {
        id: 'analysis' as const,
        title: 'Analisis Fitur & Standar Mutu',
        description: 'Hasil deteksi kerusakan jalan dengan penilaian dan skor mutu.',
        icon: BarChart3,
      },
    ],
    [],
  )

  const activeStageMeta = stages.find((stage) => stage.id === activeStage)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen flex-col lg:flex-row" style={{ maxWidth: '1600px' }}>
        <Sidebar activeStage={activeStage} onSelectStage={setActiveStage} stages={stages} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Pipeline Aktif
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{activeStageMeta?.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{activeStageMeta?.description}</p>
          </header>

          <section className="mt-5">
            {activeStage === 'data' && (
              <StageDataInput uploadedImage={uploadedImage} onImageSelected={handleImageSelected} />
            )}
            {activeStage === 'techniques' && <StageTechniques uploadedImage={uploadedImage} />}
            {activeStage === 'convolution' && <StageConvolution uploadedImage={uploadedImage} />}
            {activeStage === 'morphology' && <StageMorphology uploadedImage={uploadedImage} />}
            {activeStage === 'feature-detection' && <StageFeatureDetection uploadedImage={uploadedImage} />}
            {activeStage === 'clustering' && <StageClustering uploadedImage={uploadedImage} />}
            {activeStage === 'quantization' && <StageQuantization uploadedImage={uploadedImage} />}
            {activeStage === 'noise' && <StageNoise uploadedImage={uploadedImage} />}
            {activeStage === 'feature-matching' && <StageFeatureMatching uploadedImage={uploadedImage} />}
            {activeStage === 'analysis' && <StagePavementDamageAnalysis uploadedImage={uploadedImage} />}
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
