import confetti from 'canvas-confetti'
import { getSettings } from './settings'

export function celebrate() {
  const s = getSettings()
  if (s.reducedMotion) return
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ['#4f46e5', '#f59e0b', '#16a34a'] })
}
