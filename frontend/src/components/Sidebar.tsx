import type { LucideIcon } from 'lucide-react'
import type { StageId, StageOption } from '../types'

interface SidebarProps {
  activeStage: StageId
  onSelectStage: (stage: StageId) => void
  stages: Array<StageOption & { icon: LucideIcon }>
}

export function Sidebar({ activeStage, onSelectStage, stages }: SidebarProps) {
  return (
    <aside className="w-full border-b border-slate-200 bg-white p-4 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r lg:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Computer Vision Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Deteksi Kerusakan Jalan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Prototipe interaktif 9 tahap pemrosesan citra untuk analisis kerusakan aspal (termasuk Quantization, Noise, Feature Matching).
        </p>
      </div>

      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {stages.map((stage, index) => {
          const isActive = stage.id === activeStage
          const Icon = stage.icon
          return (
            <button
              key={stage.id}
              onClick={() => onSelectStage(stage.id)}
              className={[
                'group rounded-xl border px-3 py-3 text-left transition-all duration-300',
                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none',
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'bg-white/20' : 'bg-white',
                  ].join(' ')}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Tahap {index + 1}
                  </p>
                  <p className="text-sm font-semibold">{stage.title}</p>
                </div>
              </div>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
