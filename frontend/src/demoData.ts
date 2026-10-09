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

export interface DemoPrediction {
  id: string
  displayName: string
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  sizeBytes: number
  predictedClass: ClassCode
  classScores: Scores
  createdAt: string
  isSeed: boolean
}

const DB_NAME = 'oct-vision-interface-demo'
const STORE_NAME = 'predictions'
const SEEDED_KEY = 'oct-vision-demo-seeded-v1'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = createRequest(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => database.close()
  })
}

export async function listPredictions(): Promise<DemoPrediction[]> {
  const records = await transact('readonly', (store) => store.getAll()) as DemoPrediction[]
  return records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export async function savePrediction(record: DemoPrediction): Promise<void> {
  await transact('readwrite', (store) => store.put(record))
}

export async function deletePrediction(id: string): Promise<void> {
  await transact('readwrite', (store) => store.delete(id))
}

export async function clearPredictions(): Promise<void> {
  await transact('readwrite', (store) => store.clear())
  localStorage.setItem(SEEDED_KEY, 'true')
}

function illustration(index: number): string {
  const curves = Array.from({ length: 12 }, (_, line) => {
    const y = 104 + line * 13
    const bend = (index * 11 + line * 5) % 27
    const opacity = line % 4 === 0 ? 0.42 : 0.2
    return `<path d="M0 ${y} C110 ${y - bend} 190 ${y + bend} 300 ${y + 2} S500 ${y - bend} 640 ${y + 3}" fill="none" stroke="#d6e2ee" stroke-width="${line % 4 === 0 ? 3 : 2}" opacity="${opacity}"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#0e1c32"/><stop offset="1" stop-color="#1e334b"/></linearGradient><radialGradient id="glow"><stop stop-color="#8da6b8" stop-opacity=".22"/><stop offset="1" stop-color="#8da6b8" stop-opacity="0"/></radialGradient></defs><rect width="640" height="360" fill="url(#bg)"/><ellipse cx="340" cy="170" rx="285" ry="110" fill="url(#glow)"/>${curves}<path d="M0 183 C120 178 174 206 270 189 S471 192 640 179" fill="none" stroke="#e2e8f0" stroke-opacity=".6" stroke-width="3"/><path d="M0 221 C130 207 190 242 299 226 S492 236 640 218" fill="none" stroke="#c7d2de" stroke-opacity=".48" stroke-width="2"/><text x="34" y="329" font-family="Arial,sans-serif" font-size="16" letter-spacing="5" fill="#e2e8f0" opacity=".55">DEMO · MINH HỌA</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function seededRecord(index: number, code: ClassCode, score: number, hoursAgo: number): DemoPrediction {
  const residual = (1 - score) / 3
  const classScores = Object.fromEntries(CLASS_CODES.map((key) => [key, key === code ? score : residual])) as Scores
  return {
    id: `sample-${index}`,
    displayName: `Ảnh minh họa ${String(index).padStart(2, '0')}`,
    imageDataUrl: illustration(index),
    imageWidth: 640,
    imageHeight: 360,
    sizeBytes: 0,
    predictedClass: code,
    classScores,
    createdAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
    isSeed: true,
  }
}

export async function ensureDemoSeed(): Promise<void> {
  if (localStorage.getItem(SEEDED_KEY)) return
  const records = [
    seededRecord(1, 'NORMAL', 0.946, 2),
    seededRecord(2, 'CNV', 0.872, 7),
    seededRecord(3, 'DME', 0.904, 27),
    seededRecord(4, 'DRUSEN', 0.836, 33),
    seededRecord(5, 'NORMAL', 0.924, 51),
    seededRecord(6, 'CNV', 0.886, 72),
  ]
  for (const record of records) await savePrediction(record)
  localStorage.setItem(SEEDED_KEY, 'true')
}

export function demoScores(file: File): Scores {
  let seed = file.size + file.lastModified
  for (const character of file.name) seed = (seed * 31 + character.charCodeAt(0)) >>> 0
  const values = CLASS_CODES.map((_, index) => 0.15 + ((seed >>> (index * 6)) & 31) / 24)
  const highestIndex = seed % CLASS_CODES.length
  values[highestIndex] += 2.5
  const total = values.reduce((sum, current) => sum + current, 0)
  return Object.fromEntries(CLASS_CODES.map((key, index) => [key, values[index] / total])) as Scores
}

export function topClass(scores: Scores): ClassCode {
  return CLASS_CODES.reduce((current, candidate) => scores[candidate] > scores[current] ? candidate : current)
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
      throw new Error('Kích thước ảnh vượt giới hạn xử lý của bản demo.')
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
