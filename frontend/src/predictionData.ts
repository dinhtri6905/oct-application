export const CLASS_CODES = ['CNV', 'DME', 'DRUSEN', 'NORMAL'] as const

export type ClassCode = (typeof CLASS_CODES)[number]

export const CLASS_DETAILS: Record<ClassCode, { name: string; short: string; tone: string }> = {
  CNV: {
    name: 'Tân mạch hắc mạc',
    short: 'Choroidal Neovascularization',
    tone: 'rose',
  },
  DME: {
    name: 'Phù hoàng điểm do đái tháo đường',
    short: 'Diabetic Macular Edema',
    tone: 'orange',
  },
  DRUSEN: {
    name: 'Lắng đọng Drusen',
    short: 'Drusen',
    tone: 'violet',
  },
  NORMAL: {
    name: 'Lớp NORMAL',
    short: 'Normal class',
    tone: 'green',
  },
}

export type Scores = Record<ClassCode, number>

export interface PredictionRecord {
  source: 'model'
  id: string
  displayName: string
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  sizeBytes: number
  predictedClass: ClassCode
  classScores: Scores
  modelVersion: string
  preprocessingVersion: string
  createdAt: string
  feedback?: {
    correct: boolean
    actualClass: ClassCode
    createdAt: string
    status: 'unverified'
  }
}

export async function inspectImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ảnh vượt quá 10 MB. Hãy chọn ảnh nhỏ hơn.')
  }
  const objectUrl = URL.createObjectURL(file)
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('Không thể đọc ảnh. Hãy chọn file JPG hoặc PNG khác.'))
      image.src = objectUrl
    })
    if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 20_000_000) {
      throw new Error('Kích thước ảnh vượt giới hạn xử lý. Hãy chọn ảnh nhỏ hơn.')
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Không thể đọc ảnh. Vui lòng thử lại.'))
      reader.readAsDataURL(file)
    })
    return { dataUrl, ...dimensions }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
