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
    const bentukNormal = analysisResult?.bentuk_normal || 0
    const teksturUtuh = analysisResult?.tekstur_utuh || 0
    // Gunakan Math.abs karena python mengirim nilai negatif untuk cacat
    const sourPercentage = Math.abs(analysisResult?.cacat_partial_sour || 0)

    // 1. Kalkulasi penalti dinamis persis seperti di cv_service.py
    const penaltiBentuk = bentukNormal < 0.75 ? Math.round(25 * (0.75 - bentukNormal) / 0.75) : 0;
    const penaltiTekstur = teksturUtuh < 0.85 ? Math.round(25 * (0.85 - teksturUtuh) / 0.85) : 0;
    const penaltiPigmen = sourPercentage > 0.1 ? Math.round(25 * Math.min(1.0, sourPercentage / 1.0)) : 0;

    const items = [
      {
        label: 'Bentuk Normal (Circularity)',
        value: bentukNormal,
        score: -penaltiBentuk, // Menggunakan penalti dinamis
        status: penaltiBentuk === 0 ? 'success' : 'warning',
        description:
          penaltiBentuk === 0
            ? `Bentuk cacat terukur secara standar (${(bentukNormal * 100).toFixed(1)}%). Menunjukkan pola kerusakan yang konsisten.`
            : `Bentuk cacat tidak teratur (${(bentukNormal * 100).toFixed(1)}%). Indikasi kerusakan kompleks. (-${penaltiBentuk} poin)`,
        recommendation:
          penaltiBentuk === 0
            ? 'Pola kerusakan konsisten - pemeliharaan rutin sudah cukup'
            : 'Pola kerusakan tidak teratur - diperlukan inspeksi detail lebih lanjut',
      },
      {
        label: 'Tekstur Permukaan',
        value: teksturUtuh,
        score: -penaltiTekstur, // Menggunakan penalti dinamis
        status: penaltiTekstur === 0 ? 'success' : 'warning',
        description:
          penaltiTekstur === 0
            ? `Permukaan tidak memiliki retakan signifikan (${(teksturUtuh * 100).toFixed(1)}%). Struktur masih baik.`
            : `Retakan ditemukan pada permukaan (${(teksturUtuh * 100).toFixed(1)}%). Struktur mengalami degradasi. (-${penaltiTekstur} poin)`,
        recommendation:
          penaltiTekstur === 0
            ? 'Kondisi tekstur baik - lanjutkan pemantauan berkala'
            : 'Tekstur rusak - segera lakukan perbaikan untuk mencegah perburukan',
      },
      {
        label: 'Kondisi Pigmen Jalan',
        value: sourPercentage,
        score: -penaltiPigmen, // Menggunakan penalti dinamis
        status: penaltiPigmen === 0 ? 'success' : 'warning',
        description:
          penaltiPigmen > 0
            ? `Area dengan pigmen pudar/keruh terdeteksi (${(sourPercentage * 100).toFixed(1)}%). Terjadi degradasi material aspal. (-${penaltiPigmen} poin)`
            : `Pigmen jalan dalam kondisi baik. Material masih stabil dalam batas toleransi.`,
        recommendation:
          penaltiPigmen > 0
            ? 'Mulai perencanaan penyegelan atau pelapisan ulang dalam 6-12 bulan'
            : 'Kondisi pigmen stabil - lanjutkan pemeliharaan preventif',
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
            <h3 className="mb-4 text-lg font-bold text-slate-900">1. Visualisasi Analisis Permukaan Jalan</h3>
            <p className="mb-4 text-sm text-slate-600">
              Sistem analisis menggunakan 4 metode untuk memberikan gambaran lengkap tentang kondisi permukaan jalan:
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { 
                  title: 'Geometri', 
                  key: 'geometri_base64',
                  explanation: 'Mendeteksi bentuk dan ukuran kerusakan untuk menentukan tingkat keparahan'
                },
                { 
                  title: 'Pola Retakan', 
                  key: 'pola_retakan_base64',
                  explanation: 'Mengidentifikasi pola retakan (linear, alligator, blok) untuk diagnosa akar masalah'
                },
                { 
                  title: 'Klaster Warna', 
                  key: 'klaster_warna_base64',
                  explanation: 'Segmentasi warna untuk mendeteksi area dengan degradasi berbeda'
                },
                { 
                  title: 'Tekstur Permukaan', 
                  key: 'tekstur_permukaan_base64',
                  explanation: 'Analisis tekstur untuk mengidentifikasi kehalusan dan kekasaran permukaan'
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3 flex h-24 w-24 mx-auto items-center justify-center rounded-lg bg-slate-100">
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
                  <p className="text-center text-sm font-semibold text-slate-900 mb-2">{item.title}</p>
                  <p className="text-center text-xs text-slate-600">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Rincian Penilaian */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-slate-900">2. Rincian Penilaian</h3>
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Cara membaca:</strong> Setiap aspek dianalisis dengan sistem poin. Jika kondisi baik (✓) = 0 poin pengurangan. 
                Jika ada masalah (⚠) = -25 poin. Skor akhir = 100 - total pengurangan.
              </p>
            </div>
            <div className="space-y-4">
              {assessmentItems.map((item, index) => (
                <div
                  key={index}
                  className={`overflow-hidden rounded-xl border px-4 py-4 ${
                    item.status === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.status === 'success' ? (
                        <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`font-semibold ${item.status === 'success' ? 'text-green-700' : 'text-yellow-700'}`}>
                          {item.label}
                        </p>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
                            item.status === 'success'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-yellow-200 text-yellow-800'
                          }`}
                        >
                          {item.score > 0 ? '+' : ''}{item.score} poin
                        </span>
                      </div>
                      <p className={`text-sm mb-2 ${item.status === 'success' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {item.description}
                      </p>
                      <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-1">💡 Rekomendasi:</p>
                        <p className="text-xs text-slate-600">{item.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Skor Akhir & Rekomendasi */}
          <div>
            <div className={`rounded-2xl border px-6 py-8 text-center ${statusColor}`}>
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Skor Akhir Mutu Jalan</p>
              <p className="mt-2 text-6xl font-bold">{Math.round(finalScore)}</p>
              <p className="mt-3 text-lg font-semibold">{statusLabel}</p>
            </div>

            {/* Penjelasan Skor & Rekomendasi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Penjelasan Kategori */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="font-semibold text-slate-900 mb-3">📊 Kategori Skor</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span><strong>75-100:</strong> Sangat Baik (minimal perawatan)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span><strong>50-75:</strong> Baik (perawatan rutin)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                    <span><strong>25-50:</strong> Rusak (perbaikan diperlukan)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span><strong>0-25:</strong> Rusak Parah (rehab mendesak)</span>
                  </div>
                </div>
              </div>

              {/* Rekomendasi Aksi */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="font-semibold text-slate-900 mb-3">✅ Rekomendasi Aksi</h4>
                <div className="space-y-2 text-sm">
                  {finalScore >= 75 && (
                    <>
                      <p className="text-green-700">✓ Jalan dalam kondisi prima</p>
                      <p className="text-slate-600">• Lanjutkan pemantauan rutin (3-6 bulan sekali)</p>
                      <p className="text-slate-600">• Vakum dan pembersihan berkala</p>
                    </>
                  )}
                  {finalScore >= 50 && finalScore < 75 && (
                    <>
                      <p className="text-blue-700">⚠ Jalan masih layak dengan perawatan</p>
                      <p className="text-slate-600">• Inspeksi bulanan untuk monitor perkembangan</p>
                      <p className="text-slate-600">• Rencana penyegelan dalam 6 bulan ke depan</p>
                    </>
                  )}
                  {finalScore >= 25 && finalScore < 50 && (
                    <>
                      <p className="text-orange-700">⚠ Perbaikan segera diperlukan</p>
                      <p className="text-slate-600">• Inspeksi detail & survey kondisi lapangan</p>
                      <p className="text-slate-600">• Perencanaan perbaikan 1-3 bulan ke depan</p>
                    </>
                  )}
                  {finalScore < 25 && (
                    <>
                      <p className="text-red-700">🚨 Rehab/rekonstruksi mendesak</p>
                      <p className="text-slate-600">• Hubungi dinas terkait untuk assessment lengkap</p>
                      <p className="text-slate-600">• Prioritaskan untuk perbaikan segera</p>
                    </>
                  )}
                </div>
              </div>
            </div>
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
