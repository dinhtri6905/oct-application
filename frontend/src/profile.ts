export function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] || 'K') + (words.length > 1 ? words[words.length - 1][0] : '')).toLocaleUpperCase('vi-VN')
}
