import { getSettings } from './settings'

let ctx: AudioContext | null = null
function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as any).webkitAudioContext
  if (!AC) return null
  ctx ??= new AC()
  return ctx
}

export function playSound(type: 'tap' | 'success' | 'error' = 'tap') {
  const s = getSettings()
  if (!s.sound) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const osc = c.createOscillator()
  const gain = c.createGain()
  const now = c.currentTime
  const freq = type === 'success' ? 880 : type === 'error' ? 220 : 520
  osc.frequency.value = freq
  osc.type = 'sine'
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.13)
}
