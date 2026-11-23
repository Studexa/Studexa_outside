import { useTranslation } from 'react-i18next'

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage === 'km' ? 'km' : 'en'

  return (
    <select
      className={`language-selector ${className}`}
      value={language}
      aria-label={t('common.language')}
      onChange={(event) => { void i18n.changeLanguage(event.target.value) }}
    >
      <option value="en" lang="en">English</option>
      <option value="km" lang="km">ភាសាខ្មែរ</option>
    </select>
  )
}
