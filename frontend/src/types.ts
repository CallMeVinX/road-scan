export type StageId =
  | 'data'
  | 'techniques'
  | 'convolution'
  | 'morphology'
  | 'feature-detection'
  | 'clustering'
  | 'quantization'
  | 'noise'
  | 'feature-matching'
  | 'analysis'

export interface StageOption {
  id: StageId
  title: string
  description: string
}

export interface UploadedImageData {
  fileName: string
  fileType: string
  width: number
  height: number
  url: string
  file: File // TAMBAHKAN BARIS INI
}