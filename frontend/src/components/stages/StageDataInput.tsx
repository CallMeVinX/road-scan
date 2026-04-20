import { useRef, useState, type ChangeEvent, type DragEventHandler } from 'react'
import { FileImage, UploadCloud } from 'lucide-react'
import type { UploadedImageData } from '../../types'

interface StageDataInputProps {
  uploadedImage: UploadedImageData | null
  onImageSelected: (image: UploadedImageData) => void
}

export function StageDataInput({ uploadedImage, onImageSelected }: StageDataInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const readImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    // Di dalam readImageFile pada StageDataInput.tsx:
    image.onload = () => {
      onImageSelected({
        fileName: file.name,
        fileType: file.type,
        width: image.naturalWidth,
        height: image.naturalHeight,
        url: objectUrl,
        file: file, // SIMPAN FILE ASLINYA DI SINI
      })
}

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
    }

    image.src = objectUrl
  }

  const handleFilePick = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      readImageFile(selectedFile)
    }

    event.target.value = ''
  }

  const handleDrop: DragEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
    setIsDragging(false)

    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      readImageFile(droppedFile)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Input Citra Jalan</h2>
        <p className="mt-1 text-sm text-slate-600">
          Drag-and-drop area untuk memulai pipeline deteksi kerusakan jalan.
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          className={[
            'mt-5 flex h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white text-slate-700 transition',
            isDragging
              ? 'border-blue-600 bg-blue-50'
              : 'border-blue-400 hover:border-blue-600 hover:bg-blue-50',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />

          {!uploadedImage ? (
            <>
              <UploadCloud className="text-blue-600" size={36} />
              <p className="mt-3 text-base font-semibold">Drop gambar jalan rusak di sini</p>
              <p className="text-sm text-slate-500">Klik atau drag-and-drop untuk upload file asli</p>
            </>
          ) : (
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <img src={uploadedImage.url} alt="Uploaded road damage" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Input loaded: {uploadedImage.fileName}
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

        {!uploadedImage ? (
          <p className="mt-4 text-sm text-slate-500">
            Belum ada gambar. Unggah citra untuk menampilkan metadata.
          </p>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Nama File</dt>
              <dd className="font-semibold text-slate-900">{uploadedImage.fileName}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Resolusi</dt>
              <dd className="font-semibold text-slate-900">{uploadedImage.width} x {uploadedImage.height}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Format</dt>
              <dd className="font-semibold text-slate-900">{uploadedImage.fileType || 'Unknown'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold text-slate-900">Ready for all stages</dd>
            </div>
          </dl>
        )}
      </aside>
    </div>
  )
}
