export type StageId =
  | 'data'
  | 'techniques'
  | 'convolution'
  | 'morphology'
  | 'feature-detection'
  | 'clustering'

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
}
