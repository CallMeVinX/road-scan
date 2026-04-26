import { useState } from 'react'
import type { UploadedImageData } from '../../types'

type MatchingMethod = 'sift' | 'template' | 'compare'

interface StageFeatureMatchingProps {
  uploadedImage: UploadedImageData | null
}

export function StageFeatureMatching({ uploadedImage }: StageFeatureMatchingProps) {
  const [image1, setImage1] = useState<File | null>(null)
  const [image2, setImage2] = useState<File | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [matchStats, setMatchStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeMethod, setActiveMethod] = useState<MatchingMethod>('sift')
  const [preview1, setPreview1] = useState<string | null>(null)
  const [preview2, setPreview2] = useState<string | null>(null)

  const handleImageSelect = (file: File | null, setPreview: any, isFirst: boolean) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      if (isFirst) {
        setImage1(file)
      } else {
        setImage2(file)
      }
    }
  }

  const processMatching = async (method: MatchingMethod) => {
    const img1 = image1 || (uploadedImage?.file || null)
    const img2 = image2

    if (!img1 || !img2) {
      console.warn('Both images must be selected')
      return
    }

    setIsLoading(true)
    const formData = new FormData()

    try {
      let endpoint = ''

      switch (method) {
        case 'sift':
          endpoint = 'http://127.0.0.1:8000/api/v1/feature-matching/sift'
          formData.append('image1', img1)
          formData.append('image2', img2)
          formData.append('max_matches', '20')
          break
        case 'template':
          endpoint = 'http://127.0.0.1:8000/api/v1/feature-matching/template'
          formData.append('template', img1)
          formData.append('image', img2)
          break
        case 'compare':
          endpoint = 'http://127.0.0.1:8000/api/v1/feature-matching/compare-methods'
          formData.append('image1', img1)
          formData.append('image2', img2)
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error(`Gagal memproses ${method}`)
      const data = await response.json()

      // Handle different response formats
      if (data.visualization_base64) {
        setResultImage(`data:image/png;base64,${data.visualization_base64}`)
      } else if (data.comparison?.sift?.visualization_base64) {
        // For compare method, prioritize SIFT visualization
        setResultImage(`data:image/png;base64,${data.comparison.sift.visualization_base64}`)
      }

      setMatchStats(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMethodLabel = (method: MatchingMethod): string => {
    const labels: { [key in MatchingMethod]: string } = {
      'sift': 'SIFT Matching',
      'template': 'Template Matching',
      'compare': 'Compare Methods'
    }
    return labels[method]
  }

  return (
    <div className="grid gap-6">
      {/* Control Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Feature Detection & Matching</h2>
          <p className="mt-1 text-sm text-slate-600">
            Mencocokkan fitur antara dua gambar menggunakan SIFT atau Template Matching.
          </p>
        </div>

        {/* Image Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Gambar 1 (Query)</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e.target.files?.[0] || null, setPreview1, true)}
                className="hidden"
                id="image1-input"
              />
              <label
                htmlFor="image1-input"
                className="block w-full p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 text-center bg-slate-50"
              >
                {preview1 ? 'Ganti Gambar' : 'Pilih Gambar 1'}
              </label>
              {preview1 && (
                <img
                  src={preview1}
                  alt="Preview 1"
                  className="mt-2 w-full rounded-lg max-h-48 object-cover"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Gambar 2 (Reference)</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e.target.files?.[0] || null, setPreview2, false)}
                className="hidden"
                id="image2-input"
              />
              <label
                htmlFor="image2-input"
                className="block w-full p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 text-center bg-slate-50"
              >
                {preview2 ? 'Ganti Gambar' : 'Pilih Gambar 2'}
              </label>
              {preview2 && (
                <img
                  src={preview2}
                  alt="Preview 2"
                  className="mt-2 w-full rounded-lg max-h-48 object-cover"
                />
              )}
            </div>
          </div>
        </div>

        {/* Method Selection */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['sift', 'template', 'compare'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setActiveMethod(method)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeMethod === method
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {getMethodLabel(method)}
            </button>
          ))}
        </div>

        {/* Method Explanation */}
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          {activeMethod === 'sift' && (
            <p><strong>SIFT:</strong> Cocok untuk membandingkan 2 gambar dengan ukuran dan perspektif berbeda. Menemukan keypoints unik yang match antar gambar.</p>
          )}
          {activeMethod === 'template' && (
            <p><strong>Template Matching:</strong> Mencari lokasi pola template di dalam gambar. Menampilkan bounding boxes tempat pola ditemukan. Jika ukuran berbeda jauh, akan otomatis crop template dari center.</p>
          )}
          {activeMethod === 'compare' && (
            <p><strong>Compare Methods:</strong> Membandingkan hasil SIFT dan Template Matching pada 2 gambar yang sama.</p>
          )}
        </div>

        {/* Process Button */}
        <button
          onClick={() => processMatching(activeMethod)}
          disabled={isLoading || !image1 || !image2}
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Matching...' : `Jalankan ${getMethodLabel(activeMethod)}`}
        </button>
      </section>

      {/* Results */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main Result */}
        {resultImage && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              {activeMethod === 'compare' ? 'SIFT Visualization' : 'Hasil Matching'}
            </h3>
            <img
              src={resultImage}
              alt="Matching result"
              className="w-full rounded-xl border border-slate-200"
            />
            {activeMethod === 'compare' && matchStats?.comparison?.template_matching?.visualization_base64 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Template Matching Visualization</h3>
                <img
                  src={`data:image/png;base64,${matchStats.comparison.template_matching.visualization_base64}`}
                  alt="Template matching result"
                  className="w-full rounded-xl border border-slate-200"
                />
              </div>
            )}
            {activeMethod === 'compare' && !matchStats?.comparison?.template_matching?.visualization_base64 && matchStats?.comparison?.template_matching?.error && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-amber-600">
                  ⚠️ Template Matching: {matchStats.comparison.template_matching.error}
                </p>
                {matchStats.comparison.template_matching.suggestion && (
                  <p className="text-sm text-blue-600 mt-2">
                    💡 {matchStats.comparison.template_matching.suggestion}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Statistics */}
        {matchStats && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 h-fit">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Statistik</h3>

            <div className="space-y-3 text-sm">
              {matchStats.matched_points !== undefined && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-slate-600">Matched Points</p>
                  <p className="text-xl font-bold text-blue-600">{matchStats.matched_points}</p>
                </div>
              )}

              {matchStats.keypoints_image1 !== undefined && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-600">Keypoints Img1</p>
                  <p className="text-lg font-bold text-slate-900">{matchStats.keypoints_image1}</p>
                </div>
              )}

              {matchStats.keypoints_image2 !== undefined && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-600">Keypoints Img2</p>
                  <p className="text-lg font-bold text-slate-900">{matchStats.keypoints_image2}</p>
                </div>
              )}

              {matchStats.total_matches !== undefined && activeMethod === 'template' && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-slate-600">Lokasi Template Ditemukan</p>
                  <p className="text-lg font-bold text-green-600">{matchStats.total_matches}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Bounding boxes menunjukkan lokasi pola yang cocok dalam gambar
                  </p>
                </div>
              )}

              {matchStats.total_matches !== undefined && activeMethod !== 'template' && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-slate-600">Total Matches</p>
                  <p className="text-lg font-bold text-green-600">{matchStats.total_matches}</p>
                </div>
              )}

              {matchStats.comparison?.sift?.matched_points !== undefined && (
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600">SIFT Matches</p>
                    <p className="text-lg font-bold text-blue-600">
                      {matchStats.comparison.sift.matched_points}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600">Template Matches</p>
                    <p className="text-lg font-bold text-purple-600">
                      {matchStats.comparison.template_matching.total_matches || matchStats.comparison.template_matching.matched_locations}
                    </p>
                    {matchStats.comparison.template_matching.error && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ {matchStats.comparison.template_matching.error}
                      </p>
                    )}
                    {matchStats.comparison.template_matching.suggestion && (
                      <p className="text-xs text-amber-600 mt-1">
                        💡 {matchStats.comparison.template_matching.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {matchStats.error && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-600 mb-1">Error</p>
                  <p className="text-xs text-red-600">{matchStats.error}</p>
                  {matchStats.suggestion && (
                    <p className="text-xs text-amber-600 mt-2 border-t border-red-200 pt-2">
                      💡 {matchStats.suggestion}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {!resultImage && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Upload 2 gambar dan klik tombol untuk melihat hasil matching</p>
        </div>
      )}
    </div>
  )
}
