import { useState } from 'react'

type MorphMode = 'dilation' | 'erosion'

export function StageMorphology() {
  const [mode, setMode] = useState<MorphMode>('dilation')

  const crackScale = mode === 'dilation' ? 1.2 : 0.78
  const crackOpacity = mode === 'dilation' ? 1 : 0.65

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Simulasi Operasi Morfologi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Dilation memperbesar area retakan, sedangkan erosion mengikis noise kecil.
        </p>

        <div className="mt-5 relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(115deg,#656d77_0%,#2f3540_52%,#1d2128_100%)]">
          <div
            className="absolute inset-0 origin-center transition-all duration-500"
            style={{ transform: `scale(${crackScale})`, opacity: crackOpacity }}
          >
            <div className="absolute left-[16%] top-[20%] h-44 rotate-12 bg-white/95" style={{ width: '4px' }} />
            <div className="absolute left-[26%] top-[18%] h-52 -rotate-6 bg-white/85" style={{ width: '2px' }} />
            <div className="absolute left-[43%] top-[15%] h-48 rotate-8 bg-white/88" style={{ width: '3px' }} />
            <div className="absolute left-[61%] top-[24%] h-42 -rotate-10 bg-white/80" style={{ width: '2px' }} />
            <div className="absolute left-[72%] top-[18%] h-56 rotate-4 bg-white/90" style={{ width: '3px' }} />
          </div>

          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
            Mode: {mode === 'dilation' ? 'Dilation (Pelebaran)' : 'Erosion (Pengikisan)'}
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Pilih Operasi</h3>

        <div className="mt-4 space-y-3">
          <button
            onClick={() => setMode('dilation')}
            className={[
              'w-full rounded-xl border px-4 py-4 text-left text-base font-semibold transition',
              mode === 'dilation'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200',
            ].join(' ')}
          >
            Dilation
            <p className="mt-1 text-xs font-normal opacity-90">Menyambungkan titik retakan terputus</p>
          </button>

          <button
            onClick={() => setMode('erosion')}
            className={[
              'w-full rounded-xl border px-4 py-4 text-left text-base font-semibold transition',
              mode === 'erosion'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200',
            ].join(' ')}
          >
            Erosion
            <p className="mt-1 text-xs font-normal opacity-90">Menghilangkan noise kecil pada area terang</p>
          </button>
        </div>
      </aside>
    </div>
  )
}
