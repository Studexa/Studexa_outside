import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { getSettings, updateSettings, subscribeSettings } from '../../lib/settings'
import { playSound } from '../../lib/sound'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const [s, setS] = useState(getSettings())
  useEffect(() => {
    return subscribeSettings(() => setS(getSettings()))
  }, [])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('shell.settings')}</h1>
      <Card title={t('common.language')}>
        <div className="flex gap-2">
          <Button variant={i18n.language === 'en' ? 'primary' : 'secondary'} onClick={() => i18n.changeLanguage('en')}>{t('common.english')}</Button>
          <Button variant={i18n.language === 'km' ? 'primary' : 'secondary'} onClick={() => i18n.changeLanguage('km')}>{t('common.khmer')}</Button>
        </div>
      </Card>
      <Card title={t('common.theme')}>
        <div className="flex gap-2">
          <Button variant={s.theme === 'light' ? 'primary' : 'secondary'} onClick={() => updateSettings({ theme: 'light' })}>{t('common.light')}</Button>
          <Button variant={s.theme === 'dark' ? 'primary' : 'secondary'} onClick={() => updateSettings({ theme: 'dark' })}>{t('common.dark')}</Button>
        </div>
      </Card>
      <Card title={t('common.sound')}>
        <div className="flex gap-2">
          <Button variant={s.sound ? 'primary' : 'secondary'} onClick={() => { updateSettings({ sound: true }); setTimeout(() => playSound('success'), 0) }}>{t('common.on')}</Button>
          <Button variant={!s.sound ? 'primary' : 'secondary'} onClick={() => updateSettings({ sound: false })}>{t('common.off')}</Button>
        </div>
      </Card>
      <Card title={t('common.reducedMotion')}>
        <div className="flex gap-2">
          <Button variant={!s.reducedMotion ? 'primary' : 'secondary'} onClick={() => updateSettings({ reducedMotion: false })}>{t('common.off')}</Button>
          <Button variant={s.reducedMotion ? 'primary' : 'secondary'} onClick={() => updateSettings({ reducedMotion: true })}>{t('common.on')}</Button>
        </div>
      </Card>
    </div>
  )
}
