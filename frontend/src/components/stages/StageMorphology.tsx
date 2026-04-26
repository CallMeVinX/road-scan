import { useState, useEffect, useRef } from 'react'
import type { UploadedImageData } from '../../types'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type MorphMode = 'dilation' | 'erosion' | 'opening' | 'closing'

interface MorphOption {
  id: MorphMode
  label: string
  symbol: string
  shortDesc: string
  longDesc: string
  colorClass: string
  activeClass: string
}

interface StageMorphologyProps {
  uploadedImage: UploadedImageData | null
}

// ---------------------------------------------------------------------------
// KONSTANTA OPERASI
// ---------------------------------------------------------------------------

const MORPH_OPTIONS: MorphOption[] = [
  {
    id: 'dilation',
    label: 'Dilation',
    symbol: '⊕',
    shortDesc: 'Dilasi',
    longDesc: 'Memperluas area terang — menebalkan fitur dan mengisi celah kecil pada retakan.',
    colorClass: 'text-blue-700',
    activeClass: 'border-blue-600 bg-blue-600 text-white shadow-md',
  },
  {
    id: 'erosion',
    label: 'Erosion',
    symbol: '⊖',
    shortDesc: 'Erosi',
    longDesc: 'Menyempitkan area terang — mengikis noise kecil dan memperhalus tepi struktur.',
    colorClass: 'text-violet-700',
    activeClass: 'border-violet-600 bg-violet-600 text-white shadow-md',
  },
  {
    id: 'opening',
    label: 'Opening',
    symbol: '∘',
    shortDesc: 'Erosi → Dilasi',
    longDesc: 'Menghapus noise kecil tanpa mengubah ukuran struktur utama (Erosi dahulu, lalu Dilasi).',
    colorClass: 'text-emerald-700',
    activeClass: 'border-emerald-600 bg-emerald-600 text-white shadow-md',
  },
  {
    id: 'closing',
    label: 'Closing',
    symbol: '•',
    shortDesc: 'Dilasi → Erosi',
    longDesc: 'Menutup celah kecil pada retakan tanpa memperbesar tepi (Dilasi dahulu, lalu Erosi).',
    colorClass: 'text-amber-700',
    activeClass: 'border-amber-600 bg-amber-600 text-white shadow-md',
  },
]

// Aksen warna per mode untuk badge dan highlight
const ACCENT: Record<MorphMode, string> = {
  dilation: 'bg-blue-100 text-blue-700',
  erosion:  'bg-violet-100 text-violet-700',
  opening:  'bg-emerald-100 text-emerald-700',
  closing:  'bg-amber-100 text-amber-700',
}

const SPINNER_COLOR: Record<MorphMode, string> = {
  dilation: 'border-blue-600',
  erosion:  'border-violet-600',
  opening:  'border-emerald-600',
  closing:  'border-amber-600',
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

export function StageMorphology({ uploadedImage }: StageMorphologyProps) {
  const [mode, setMode]               = useState<MorphMode>('dilation')
  const [kernelSize, setKernelSize]   = useState<number>(3)
  const [iterations, setIterations]   = useState<number>(1)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [autoProcess, setAutoProcess] = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // Debounce auto-process agar tidak terlalu sering hit backend saat slider digeser
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!uploadedImage || !autoProcess || isLoading) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      processImage(mode)
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [uploadedImage, mode, kernelSize, iterations, autoProcess])

  // ---------------------------------------------------------------------------
  // PROCESS IMAGE
  // ---------------------------------------------------------------------------

  const processImage = async (selectedMode: MorphMode = mode) => {
    if (!uploadedImage?.file) return

    setMode(selectedMode)
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', uploadedImage.file)
    formData.append('operation', selectedMode)
    formData.append('iterations', String(iterations))
    formData.append('kernel_size', String(kernelSize))

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/morphology/transform', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.detail ?? `HTTP ${response.status}`)
      }

      const data = await response.json()
      setResultImage(`data:image/png;base64,${data.mask_base64}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.'
      setError(msg)
      console.error('[StageMorphology]', err)
    } finally {
      setIsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // DERIVED
  // ---------------------------------------------------------------------------

  const activeOption = MORPH_OPTIONS.find(o => o.id === mode)!

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">

      {/* ── LEFT: Preview Panel ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Operasi Morfologi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Terapkan Dilation, Erosion, Opening, atau Closing pada edge mask gambar.
            </p>
          </div>

          {/* Auto-process toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <span className="text-slate-600 font-medium">Auto</span>
            <div
              role="checkbox"
              aria-checked={autoProcess}
              onClick={() => setAutoProcess(v => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                autoProcess ? 'bg-blue-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  autoProcess ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Active Mode Badge */}
        <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ACCENT[mode]}`}>
          <span>{activeOption.symbol}</span>
          <span>{activeOption.shortDesc}</span>
          <span className="opacity-60">|</span>
          <span>Kernel {kernelSize}×{kernelSize}</span>
          <span className="opacity-60">|</span>
          <span>Iter {iterations}</span>
        </div>

        {/* Image Canvas */}
        <div className="relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center">

          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className={`h-9 w-9 animate-spin rounded-full border-2 border-t-transparent ${SPINNER_COLOR[mode]}`} />
              <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                Memproses {activeOption.label}…
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <span className="text-2xl">⚠️</span>
              <p className="text-sm font-semibold text-red-400">Gagal menghubungi backend</p>
              <p className="text-xs text-slate-500">{error}</p>
              <button
                onClick={() => processImage()}
                className="mt-2 rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                Coba Lagi
              </button>
            </div>
          ) : resultImage ? (
            <img
              src={resultImage}
              alt={`Hasil ${activeOption.label}`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : uploadedImage ? (
            <img
              src={uploadedImage.url}
              alt="Original"
              className="absolute inset-0 h-full w-full object-contain opacity-40"
            />
          ) : (
            <p className="text-sm text-slate-500">Belum ada gambar diunggah</p>
          )}

          {/* Corner label */}
          {!isLoading && !error && (
            <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {activeOption.symbol} {activeOption.label} | {kernelSize}×{kernelSize} | ×{iterations}
            </div>
          )}
        </div>

        {/* Manual Process Button (only when auto is off) */}
        {!autoProcess && (
          <button
            onClick={() => processImage()}
            disabled={isLoading || !uploadedImage}
            className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition"
          >
            {isLoading ? 'Memproses…' : '▶ Jalankan'}
          </button>
        )}
      </section>

      {/* ── RIGHT: Controls Panel ────────────────────────────────────────── */}
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col gap-5">

        <h3 className="text-base font-semibold text-slate-800">Parameter</h3>

        {/* Mode Buttons (2×2 grid) */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mode Operasi</p>
          <div className="grid grid-cols-2 gap-2">
            {MORPH_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => processImage(opt.id)}
                disabled={isLoading}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  mode === opt.id
                    ? opt.activeClass
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                } disabled:opacity-50`}
              >
                <div className="text-lg leading-none mb-1">{opt.symbol}</div>
                <div className="text-xs font-bold">{opt.label}</div>
                <div className={`text-[10px] mt-0.5 leading-tight ${mode === opt.id ? 'text-white/80' : 'text-slate-400'}`}>
                  {opt.shortDesc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Kernel Size Slider */}
        <div className="border-t border-slate-200 pt-4">
          <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>Ukuran Kernel</span>
            <span className="font-bold text-slate-900">{kernelSize}×{kernelSize}</span>
          </label>
          <input
            type="range"
            min="1"
            max="15"
            step="2"
            value={kernelSize}
            onChange={e => setKernelSize(Number(e.target.value))}
            disabled={isLoading}
            className="w-full h-2 appearance-none rounded-lg bg-slate-200 accent-slate-700 cursor-pointer disabled:opacity-50"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Nilai ganjil (1–15). Semakin besar → efek semakin ekstrem.
          </p>
        </div>

        {/* Iterations Slider */}
        <div className="border-t border-slate-200 pt-4">
          <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>Iterasi</span>
            <span className="font-bold text-slate-900">×{iterations}</span>
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={iterations}
            onChange={e => setIterations(Number(e.target.value))}
            disabled={isLoading}
            className="w-full h-2 appearance-none rounded-lg bg-slate-200 accent-slate-700 cursor-pointer disabled:opacity-50"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Berapa kali operasi diulang berturut-turut (1–5).
          </p>
        </div>

        {/* Info Box */}
        <div className={`rounded-xl p-3 border text-xs leading-relaxed ${ACCENT[mode].replace('text-', 'border-').replace('bg-', 'bg-').split(' ')[0]} bg-white border-slate-100`}>
          <p className="font-bold text-slate-800 mb-1">
            {activeOption.symbol} {activeOption.label}
          </p>
          <p className="text-slate-600">{activeOption.longDesc}</p>
        </div>

      </aside>
    </div>
  )
}
