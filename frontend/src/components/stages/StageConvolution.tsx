import { useEffect, useMemo, useState } from 'react'

const GRID_COLS = 12
const GRID_ROWS = 8

const crackCells = new Set(['2-2', '3-3', '4-3', '5-4', '6-4', '7-5', '8-5', '9-6'])

function buildGrid() {
  const cells: Array<{ key: string; intensity: number }> = []

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const key = `${col}-${row}`
      const baseIntensity = crackCells.has(key) ? 88 : 160 + ((row + col) % 2 === 0 ? 14 : -8)
      cells.push({ key, intensity: baseIntensity })
    }
  }

  return cells
}

export function StageConvolution() {
  const [kernelIndex, setKernelIndex] = useState(0)
  const [tick, setTick] = useState(0)

  const totalSteps = (GRID_COLS - 2) * (GRID_ROWS - 2)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setKernelIndex((prev) => (prev + 1) % totalSteps)
      setTick((prev) => prev + 1)
    }, 650)

    return () => window.clearInterval(timer)
  }, [totalSteps])

  const kernelRow = Math.floor(kernelIndex / (GRID_COLS - 2))
  const kernelCol = kernelIndex % (GRID_COLS - 2)

  const matrix = useMemo(() => {
    return Array.from({ length: 3 }, (_, rowOffset) => {
      return Array.from({ length: 3 }, (_, colOffset) => {
        const x = kernelCol + colOffset
        const y = kernelRow + rowOffset
        const key = `${x}-${y}`
        const base = crackCells.has(key) ? -2 : 1
        const oscillation = Math.round(Math.sin((tick + x + y) * 0.7) * 1)
        return base + oscillation
      })
    })
  }, [kernelCol, kernelRow, tick])

  const grid = useMemo(() => buildGrid(), [])

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Kernel 3x3 Sliding Window</h2>
        <p className="mt-1 text-sm text-slate-600">
          Simulasi scan kernel untuk edge detection pada retakan jalan.
        </p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-100 p-4">
          <div
            className="relative mx-auto grid w-full gap-1"
            style={{ maxWidth: '540px', gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          >
            {grid.map((cell) => (
              <div
                key={cell.key}
                className="aspect-square"
                style={{
                  borderRadius: '2px',
                  backgroundColor: `rgb(${cell.intensity}, ${cell.intensity}, ${cell.intensity})`,
                  imageRendering: 'pixelated',
                }}
              />
            ))}

            <div
              className="pointer-events-none absolute border-2 border-blue-600/80 bg-blue-300/20 shadow-[0_0_0_100vmax_rgba(59,130,246,0.04)] transition-all duration-500"
              style={{
                width: 'calc((100% - 11 * 0.25rem) / 12 * 3 + 0.5rem)',
                height: 'calc((100% - 7 * 0.25rem) / 8 * 3 + 0.5rem)',
                left: `calc(${kernelCol} * ((100% - 11 * 0.25rem) / 12 + 0.25rem))`,
                top: `calc(${kernelRow} * ((100% - 7 * 0.25rem) / 8 + 0.25rem))`,
              }}
            />
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Matriks Kernel (3x3)</h3>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {matrix.flat().map((value, index) => (
            <div
              key={`${value}-${index}`}
              className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 transition"
            >
              {value}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Nilai matriks berubah secara simulasi untuk menggambarkan respons filter edge terhadap pola retakan.
        </p>
      </aside>
    </div>
  )
}
