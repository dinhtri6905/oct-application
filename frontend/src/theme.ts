export type Theme = 'light' | 'dark'

const KEY = 'oct-vision-theme'

export function readTheme(): Theme {
  try {
    const value = window.localStorage.getItem(KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // Browser storage can be unavailable in private browsing.
  }
  return 'light'
}

export function saveTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  try { window.localStorage.setItem(KEY, theme) } catch { /* Keep the session preference. */ }
}
