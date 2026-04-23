import { useRef, useState, useEffect, type ChangeEvent, type DragEventHandler } from 'react'
import { FileImage, UploadCloud, ImageIcon } from 'lucide-react'
import type { UploadedImageData } from '../../types'

interface PlaceholderImage {
  filename: string
  name: string
  url: string
}

interface StageDataInputProps {
  uploadedImage: UploadedImageData | null
  onImageSelected: (image: UploadedImageData) => void
}

export function StageDataInput({ uploadedImage, onImageSelected }: StageDataInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'placeholder'>('upload')
  const [placeholders, setPlaceholders] = useState<PlaceholderImage[]>([])
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load placeholder images on component mount
  useEffect(() => {
    if (activeTab === 'placeholder') {
      loadPlaceholders()
    }
  }, [activeTab])

  const loadPlaceholders = async () => {
    setLoadingPlaceholders(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/data/placeholders')
      if (response.ok) {
        const data = await response.json()
        setPlaceholders(data.placeholders)
      }
    } catch (error) {
      console.error('Failed to load placeholders:', error)
    } finally {
      setLoadingPlaceholders(false)
    }
  }

  const readImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      onImageSelected({
        fileName: file.name,
        fileType: file.type,
        width: image.naturalWidth,
        height: image.naturalHeight,
        url: objectUrl,
        file: file,
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

  const handlePlaceholderSelect = async (placeholder: PlaceholderImage) => {
    try {
      const imageUrl = `http://127.0.0.1:8000${placeholder.url}`
      const response = await fetch(imageUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }

      const blob = await response.blob()
      const file = new File([blob], placeholder.filename, { type: blob.type || 'image/jpeg' })
      readImageFile(file)
      
    } catch (error) {
      console.error('Failed to load placeholder image:', error)
      alert('Gagal memuat gambar sample. Pastikan backend aktif.')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Input Citra Jalan</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pilih sumber gambar untuk memulai pipeline deteksi kerusakan jalan.
        </p>

        {/* Tab Navigation */}
        <div className="mt-4 flex rounded-lg bg-white p-1">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud size={16} className="mr-2 inline" />
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('placeholder')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === 'placeholder'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon size={16} className="mr-2 inline" />
            Pilih Sample
          </button>
        </div>

        {/* Upload Tab Content */}
        {activeTab === 'upload' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            className={`mt-5 flex h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white text-slate-700 transition ${
              isDragging
                ? 'border-blue-600 bg-blue-50'
                : 'border-blue-400 hover:border-blue-600 hover:bg-blue-50'
            }`}
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
                <img src={uploadedImage.url} alt="Uploaded road damage" className="h-full w-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Input loaded: {uploadedImage.fileName}
                </div>
              </div>
            )}
          </button>
        )}

        {/* Placeholder Tab Content */}
        {activeTab === 'placeholder' && (
          <div className="mt-5">
            {loadingPlaceholders ? (
              <div className="flex h-72 items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-white">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  <p className="text-sm text-slate-600">Memuat gambar sample...</p>
                </div>
              </div>
            ) : placeholders.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white">
                <div className="text-center">
                  <ImageIcon className="mx-auto mb-3 text-slate-400" size={36} />
                  <p className="text-sm text-slate-500">Belum ada gambar sample tersedia</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Letakkan gambar di folder backend/app/static/placeholders/
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                {placeholders.map((placeholder) => (
                  <button
                    key={placeholder.filename}
                    onClick={() => handlePlaceholderSelect(placeholder)}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-400 hover:shadow-md"
                  >
                    <img
                      src={`http://127.0.0.1:8000${placeholder.url}`}
                      alt={placeholder.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
                      <p className="text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                        {placeholder.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
