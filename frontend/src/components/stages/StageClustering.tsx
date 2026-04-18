import { useMemo, useState } from 'react'
import type { UploadedImageData } from '../../types'

interface StageClusteringProps {
  uploadedImage: UploadedImageData | null
}

export function StageClustering({ uploadedImage }: StageClusteringProps) {
  const [clustered, setClustered] = useState(false)

  const segments = useMemo(
    () => ({
      normal: 61,
      damage: 27,
      line: 12,
    }),
    [],
  )

  const pie = `conic-gradient(#6b7280 0 ${segments.normal}%, #1d4ed8 ${segments.normal}% ${segments.normal + segments.damage}%, #ffffff ${segments.normal + segments.damage}% 100%)`

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">K-Means Clustering (K = 3)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Segmentasi area jalan menjadi aspal normal, area kerusakan, dan garis marka.
        </p>

        <div className="relative mt-5 h-80 overflow-hidden rounded-xl border border-slate-200">
          {uploadedImage ? (
            <img src={uploadedImage.url} alt="Road image for clustering" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(120deg,#7c848d_0%,#40464f_46%,#272c34_100%)]" />
          )}
          {uploadedImage && <div className="absolute inset-0 bg-black/15" />}
          <div className="absolute left-[20%] top-[26%] h-24 w-44 rotate-[-8deg] rounded-[45%] bg-black/45" />
          <div className="absolute left-[65%] top-0 h-full w-3 rotate-[8deg] bg-white/80" />

          <div
            className={[
              'absolute inset-0 transition-opacity duration-700',
              clustered ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            <div className="absolute inset-0 bg-[#6b7280]/85" />
            <div className="absolute left-[18%] top-[22%] h-32 w-52 rotate-[-7deg] rounded-[46%] bg-[#1d4ed8]/90" />
            <div className="absolute left-[64%] top-0 h-full w-4 rotate-[8deg] bg-white/95" />
          </div>

          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
            {clustered ? 'Clustering complete' : 'Waiting for clustering'}
          </div>
        </div>

        <button
          onClick={() => setClustered((prev) => !prev)}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {clustered ? 'Reset Segmentasi' : 'Jalankan K-Means'}
        </button>
      </section>

      <aside className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
        <h3 className="text-base font-semibold text-slate-900">Persentase Area</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-24 w-24 rounded-full border border-slate-200" style={{ background: pie }}>
            <div className="absolute inset-4 rounded-full bg-white" />
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="inline-block h-2 w-2 rounded-full bg-slate-500" /> Aspal normal: {segments.normal}%
            </p>
            <p>
              <span className="inline-block h-2 w-2 rounded-full bg-blue-700" /> Retakan/lubang: {segments.damage}%
            </p>
            <p>
              <span className="inline-block h-2 w-2 rounded-full border border-slate-400 bg-white" /> Garis jalan: {segments.line}%
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
