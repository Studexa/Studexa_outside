import { useEffect, useState } from 'react'
import { getSettings, subscribeSettings } from './settings'

export function useSettings() {
  const [settings, setSettings] = useState(getSettings)
  useEffect(() => subscribeSettings(() => setSettings(getSettings())), [])
  return settings
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
