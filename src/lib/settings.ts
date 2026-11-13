export type Theme = 'light' | 'dark'
export type FontSize = 'sm' | 'md' | 'lg'
type Settings = { theme: Theme; sound: boolean; reducedMotion: boolean; fontSize: FontSize }
const KEY = 'studexa_settings'
const listeners = new Set<() => void>()

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}
function systemPrefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function getSettings(): Settings {
  const base: Settings = {
    theme: systemPrefersDark() ? 'dark' : 'light',
    sound: true,
    reducedMotion: systemPrefersReduced(),
    fontSize: 'md',
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...base, ...JSON.parse(raw) }
  } catch {
    return base
  }
  return base
}

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  applySettings(next)
  listeners.forEach((l) => l())
}

export function subscribeSettings(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function applySettings(s = getSettings()) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', s.theme === 'dark')
  document.documentElement.dataset.fontSize = s.fontSize
}
