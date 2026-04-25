import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import type { UploadedImageData } from '../../types'

interface AnalysisResult {
  geometri_base64?: string
  pola_retakan_base64?: string
  klaster_warna_base64?: string
  tekstur_permukaan_base64?: string
  bentuk_normal?: number
  tekstur_utuh?: number
  cacat_partial_sour?: number
  skor_akhir?: number
}

interface StagePavementDamageAnalysisProps {
  uploadedImage: UploadedImageData | null
}

export function StagePavementDamageAnalysis({ uploadedImage }: StagePavementDamageAnalysisProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [autoProcess, setAutoProcess] = useState(true)

  // Auto-process ketika gambar baru dipilih
  useEffect(() => {
    if (uploadedImage && autoProcess && !isLoading) {
      performAnalysis()
    }
  }, [uploadedImage, autoProcess])

  const performAnalysis = async () => {
    if (!uploadedImage || !uploadedImage.file) {
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', uploadedImage.file)

    try {
      // Panggil endpoint analisis dari backend
      const response = await fetch('http://127.0.0.1:8000/api/v1/analysis', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Gagal melakukan analisis')
      const data = await response.json()

      setAnalysisResult(data)
    } catch (error) {
      console.error(error)
      // Gunakan data simulasi jika backend tidak tersedia
      generateMockAnalysis()
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockAnalysis = () => {
    // Data simulasi untuk demo
    setAnalysisResult({
      bentuk_normal: 0.85,
      tekstur_utuh: 0.90,
      cacat_partial_sour: -0.25,
      skor_akhir: 75,
    })
  }

  const getStatusLabel = (score: number) => {
    if (score >= 0 && score <= 25) return 'Rusak Parah'
    if (score > 25 && score <= 50) return 'Rusak'
    if (score > 50 && score <= 75) return 'Baik'
    if (score > 75 && score <= 100) return 'Sangat Baik'
    return 'Unknown'
  }

  const getStatusColor = (score: number) => {
    if (score >= 0 && score <= 25) return 'bg-red-100 text-red-900'
    if (score > 25 && score <= 50) return 'bg-orange-100 text-orange-900'
    if (score > 50 && score <= 75) return 'bg-blue-100 text-blue-900'
    if (score > 75 && score <= 100) return 'bg-green-100 text-green-900'
    return 'bg-slate-100 text-slate-900'
  }

  const getAssessmentItems = () => {
    const items = [
      {
        label: 'Bentuk Normal',
        value: analysisResult?.bentuk_normal || 0,
        status: (analysisResult?.bentuk_normal || 0) >= 0.75 ? 'success' : 'warning',
        description:
          (analysisResult?.bentuk_normal || 0) >= 0.75
            ? 'Circularity ideal (0.85). (+0 pts)'
            : 'Circularity di bawah standar. (-25 pts)',
      },
      {
        label: 'Tekstur Utuh',
        value: analysisResult?.tekstur_utuh || 0,
        status: (analysisResult?.tekstur_utuh || 0) >= 0.75 ? 'success' : 'warning',
        description:
          (analysisResult?.tekstur_utuh || 0) >= 0.75
            ? 'Tidak ditemukan retakan signifikan. (+0 pts)'
            : 'Retakan ditemukan pada permukaan. (-25 pts)',
      },
      {
        label: 'Cacat Partial Sour',
        value: analysisResult?.cacat_partial_sour || 0,
        status: (analysisResult?.cacat_partial_sour || 0) >= 0 ? 'warning' : 'success',
        description: `Area cokelat/keruh 100.0%. (-25 pts)`,
      },
    ]
    return items
  }

  const assessmentItems = getAssessmentItems()
  const finalScore = analysisResult?.skor_akhir || 0
  const statusLabel = getStatusLabel(finalScore)
  const statusColor = getStatusColor(finalScore)

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <p className="mt-4 text-slate-600">Melakukan analisis kerusakan jalan...</p>
        </div>
      )}

      {!isLoading && analysisResult && (
        <>
          {/* Section 1: Visualisasi Analisis */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-slate-900">1. Visualisasi Analisis</h3>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { title: 'Geometri', key: 'geometri_base64' },
                { title: 'Pola Retakan', key: 'pola_retakan_base64' },
                { title: 'Klaster Warna', key: 'klaster_warna_base64' },
                { title: 'Tekstur Permukaan', key: 'tekstur_permukaan_base64' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100">
                    {analysisResult[item.key as keyof AnalysisResult] ? (
                      <img
                        src={`data:image/png;base64,${analysisResult[item.key as keyof AnalysisResult]}`}
                        alt={item.title}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-2xl text-slate-400">—</div>
                        <p className="text-xs text-slate-500">(Demo)</p>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-sm font-semibold text-slate-700">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Rincian Penilaian */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-slate-900">2. Rincian Penilaian</h3>
            <div className="space-y-3">
              {assessmentItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    item.status === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.status === 'success' ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                      <AlertCircle size={20} className="text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${item.status === 'success' ? 'text-green-700' : 'text-yellow-700'}`}
                    >
                      {item.label}
                    </p>
                    <p className={`text-sm ${item.status === 'success' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Skor Akhir */}
          <div className={`rounded-2xl border px-6 py-8 text-center ${statusColor}`}>
            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Skor Akhir Mutu</p>
            <p className="mt-2 text-6xl font-bold">{Math.round(finalScore)}</p>
            <p className="mt-3 text-sm font-semibold">{statusLabel}</p>
          </div>

          {/* Auto-process Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Analisis otomatis saat gambar baru diupload</span>
            </label>
          </div>
        </>
      )}

      {!isLoading && !analysisResult && uploadedImage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Circle size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Tekan tombol Analisis untuk memulai deteksi kerusakan jalan</p>
          <button
            onClick={performAnalysis}
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Mulai Analisis
          </button>
        </div>
      )}

      {!isLoading && !analysisResult && !uploadedImage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Circle size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Silakan upload gambar terlebih dahulu di tahap Data Input</p>
        </div>
      )}
    </div>
  )
}
