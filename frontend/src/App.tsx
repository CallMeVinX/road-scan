import { useMemo, useState } from 'react'
import {
  Aperture,
  Binary,
  Database,
  Layers,
  ScanSearch,
  Sparkles,
} from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { StageClustering } from './components/stages/StageClustering'
import { StageConvolution } from './components/stages/StageConvolution'
import { StageDataInput } from './components/stages/StageDataInput'
import { StageFeatureDetection } from './components/stages/StageFeatureDetection'
import { StageMorphology } from './components/stages/StageMorphology'
import { StageTechniques } from './components/stages/StageTechniques'
import type { StageId } from './types'

function App() {
  const [activeStage, setActiveStage] = useState<StageId>('data')

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
            {activeStage === 'data' && <StageDataInput />}
            {activeStage === 'techniques' && <StageTechniques />}
            {activeStage === 'convolution' && <StageConvolution />}
            {activeStage === 'morphology' && <StageMorphology />}
            {activeStage === 'feature-detection' && <StageFeatureDetection />}
            {activeStage === 'clustering' && <StageClustering />}
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
