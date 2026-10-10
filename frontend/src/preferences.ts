export type PageSize = 8 | 16 | 32

const STORAGE_KEY = 'oct-vision-page-size'

export function readPageSize(): PageSize {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY))
    if (value === 8 || value === 16 || value === 32) return value
  } catch {
    // The default works even if browser storage is disabled.
  }
  return 8
}

export function savePageSize(value: PageSize): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Keep the setting for the current session.
  }
}
