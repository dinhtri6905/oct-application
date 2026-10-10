import type { ClassCode, PredictionRecord } from './predictionData'

export interface Account {
  id: string
  name: string
  email: string
  createdAt: string
  csrfToken: string
}

export interface ModelInfo {
  name: string
  version: string
  ready: boolean
  classes: ClassCode[]
  input: string
  preprocessingVersion: string
  error: string | null
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

let csrfToken = ''

export function setAccount(account: Account | null) {
  csrfToken = account?.csrfToken ?? ''
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.method && init.method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError('Không thể kết nối máy chủ. Hãy kiểm tra dịch vụ và thử lại.', 0)
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string | { msg: string }[] }
    const message = typeof payload.detail === 'string' ? payload.detail
      : Array.isArray(payload.detail) ? payload.detail.map((item) => item.msg).join(', ')
        : 'Yêu cầu không thành công. Vui lòng thử lại.'
    if (response.status === 401 && !['/auth/me', '/auth/login', '/auth/register'].includes(path)) {
      window.dispatchEvent(new Event('oct-session-expired'))
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  me: () => request<Account>('/auth/me'),
  register: (name: string, email: string, password: string) => request<Account>('/auth/register', {
    method: 'POST', body: JSON.stringify({ name, email, password }),
  }),
  login: (email: string, password: string) => request<Account>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  updateProfile: (name: string) => request<Account>('/auth/profile', {
    method: 'PATCH', body: JSON.stringify({ name }),
  }),
  model: () => request<ModelInfo>('/model'),
  predictions: () => request<PredictionRecord[]>('/predictions'),
  predict: (file: File, key: string = crypto.randomUUID()) => {
    const form = new FormData()
    form.append('image', file)
    return request<PredictionRecord>('/predictions', { method: 'POST', body: form, headers: { 'Idempotency-Key': key } })
  },
  deletePrediction: (id: string) => request<void>(`/predictions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearPredictions: () => request<void>('/predictions', { method: 'DELETE' }),
  saveFeedback: (id: string, correct: boolean, actualClass: ClassCode) => request<PredictionRecord>(
    `/predictions/${encodeURIComponent(id)}/feedback`, {
      method: 'PATCH', body: JSON.stringify({ correct, actualClass }),
    },
  ),
}
