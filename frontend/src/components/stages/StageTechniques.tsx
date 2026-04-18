import { useState } from 'react'

export function StageTechniques() {
  const [slider, setSlider] = useState(52)
  const [grayscale, setGrayscale] = useState(true)
  const [threshold, setThreshold] = useState(false)

  const afterFilter = [
    grayscale ? 'grayscale(1)' : 'grayscale(0)',
    threshold ? 'contrast(2.2) brightness(0.9)' : 'contrast(1.2)',
  ].join(' ')

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Before / After Pre-processing</h2>
        <p className="mt-1 text-sm text-slate-600">
          Geser slider untuk melihat hasil pra-pemrosesan dasar.
        </p>

        <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_45%),linear-gradient(100deg,#676f79_0%,#353a43_48%,#20242b_100%)]" />
          <div className="absolute inset-0 opacity-70">
            <div className="absolute left-[24%] top-[14%] h-52 w-0.75 rotate-18 bg-white/80" />
            <div className="absolute left-[38%] top-[18%] h-44 w-0.5 -rotate-8 bg-white/80" />
            <div className="absolute left-[59%] top-[20%] h-50 w-0.5 rotate-9 bg-white/70" />
          </div>

          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
          >
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_45%),linear-gradient(100deg,#676f79_0%,#353a43_48%,#20242b_100%)]"
              style={{ filter: afterFilter }}
            />
            <div className="absolute inset-0 opacity-70" style={{ filter: afterFilter }}>
              <div className="absolute left-[24%] top-[14%] h-52 w-0.75 rotate-18 bg-white/95" />
              <div className="absolute left-[38%] top-[18%] h-44 w-0.5 -rotate-8 bg-white/95" />
              <div className="absolute left-[59%] top-[20%] h-50 w-0.5 rotate-9 bg-white/95" />
            </div>
          </div>

          <div className="absolute inset-y-0 z-20 w-0.5 bg-blue-600" style={{ left: `${slider}%` }} />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
            Before
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            After
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={slider}
          onChange={(event) => setSlider(Number(event.target.value))}
          className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-lg bg-blue-100 accent-blue-600"
        />
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Kontrol Teknik Dasar</h3>
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setGrayscale((prev) => !prev)}
            className={[
              'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition',
              grayscale
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200',
            ].join(' ')}
          >
            <span>Grayscale</span>
            <span>{grayscale ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setThreshold((prev) => !prev)}
            className={[
              'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition',
              threshold
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200',
            ].join(' ')}
          >
            <span>Thresholding</span>
            <span>{threshold ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </aside>
    </div>
  )
}
