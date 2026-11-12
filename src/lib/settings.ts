export type Theme = 'light' | 'dark'
type Settings = { theme: Theme; sound: boolean; reducedMotion: boolean }
const KEY = 'studyquest_settings'
const listeners = new Set<() => void>()

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}
function systemPrefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { theme: systemPrefersDark() ? 'dark' : 'light', sound: true, reducedMotion: systemPrefersReduced(), ...JSON.parse(raw) }
  } catch {}
  return { theme: systemPrefersDark() ? 'dark' : 'light', sound: true, reducedMotion: systemPrefersReduced() }
}

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  applySettings(next)
  listeners.forEach((l) => l())
}

export function subscribeSettings(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function applySettings(s = getSettings()) {
  document.documentElement.classList.toggle('dark', s.theme === 'dark')
}
