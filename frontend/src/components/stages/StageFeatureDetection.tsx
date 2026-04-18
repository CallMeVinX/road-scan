import { useEffect, useState } from 'react'

const corners = [
  { x: 20, y: 28 },
  { x: 33, y: 36 },
  { x: 41, y: 22 },
  { x: 52, y: 42 },
  { x: 58, y: 30 },
  { x: 65, y: 24 },
  { x: 72, y: 37 },
  { x: 79, y: 29 },
]

export function StageFeatureDetection() {
  const [activePoints, setActivePoints] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePoints((prev) => (prev < corners.length ? prev + 1 : corners.length))
    }, 280)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Harris Corner Detection (Simulasi)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Titik merah muncul bertahap lalu lock-on pada sudut tajam lubang/retakan.
        </p>

        <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(120deg,#6b737d_0%,#2e343e_50%,#1e2228_100%)]">
          <div
            className="absolute left-[22%] top-[30%] h-28 w-56 rounded-[48%] bg-black/45 blur-[0.5px]"
            style={{ transform: 'rotate(-6deg)' }}
          />
          <div className="absolute left-[30%] top-[34%] h-20 w-42 rotate-[5deg] rounded-[42%] bg-black/65" />

          {corners.map((corner, index) => (
            <div
              key={`${corner.x}-${corner.y}`}
              className={[
                'absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 transition-all duration-500',
                index < activePoints
                  ? 'scale-100 bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.18)]'
                  : 'scale-50 bg-red-200/40 opacity-0',
              ].join(' ')}
              style={{ left: `${corner.x}%`, top: `${corner.y}%` }}
            />
          ))}

          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
            Corner points detected: {activePoints}/{corners.length}
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Status Matching</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            Region of Interest: Lubang Aspal
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            Method: Harris Corner Response
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            Confidence (simulasi): 0.87
          </div>
        </div>
      </aside>
    </div>
  )
}
