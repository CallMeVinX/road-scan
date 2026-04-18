import { useState } from 'react'
import { FileImage, UploadCloud } from 'lucide-react'

export function StageDataInput() {
  const [hasImage, setHasImage] = useState(false)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Input Citra Jalan</h2>
        <p className="mt-1 text-sm text-slate-600">
          Drag-and-drop area untuk memulai pipeline deteksi kerusakan jalan.
        </p>

        <button
          onClick={() => setHasImage((prev) => !prev)}
          className="mt-5 flex h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-white text-slate-700 transition hover:border-blue-600 hover:bg-blue-50"
        >
          {!hasImage ? (
            <>
              <UploadCloud className="text-blue-600" size={36} />
              <p className="mt-3 text-base font-semibold">Drop gambar jalan rusak di sini</p>
              <p className="text-sm text-slate-500">Klik untuk simulasi upload gambar</p>
            </>
          ) : (
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_50%),linear-gradient(115deg,#707781_0%,#434a55_44%,#1f2329_100%)]" />
              <div className="absolute inset-0 opacity-70">
                <div className="absolute left-[18%] top-[22%] h-32 rotate-20 bg-white/80 blur-[0.5px]" style={{ width: '4px' }} />
                <div className="absolute left-[42%] top-[16%] h-40 -rotate-6 bg-white/85" style={{ width: '3px' }} />
                <div className="absolute left-[58%] top-[33%] h-28 rotate-12 bg-white/70" style={{ width: '2px' }} />
                <div className="absolute left-[70%] top-[20%] h-44 -rotate-12 bg-white/70" style={{ width: '2px' }} />
              </div>
              <div className="absolute bottom-3 left-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Placeholder: Aspal Retak
              </div>
            </div>
          )}
        </button>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-slate-900">
          <FileImage size={20} className="text-blue-600" />
          <h3 className="font-semibold">Metadata Gambar</h3>
        </div>

        {!hasImage ? (
          <p className="mt-4 text-sm text-slate-500">
            Belum ada gambar. Unggah citra untuk menampilkan metadata.
          </p>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Nama File</dt>
              <dd className="font-semibold text-slate-900">jalan-retak-simulasi.jpg</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Resolusi</dt>
              <dd className="font-semibold text-slate-900">1920 x 1080</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Format</dt>
              <dd className="font-semibold text-slate-900">JPEG</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Kualitas</dt>
              <dd className="font-semibold text-slate-900">8-bit, RGB</dd>
            </div>
          </dl>
        )}
      </aside>
    </div>
  )
}
