import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/Icon'
import readingBooks from '../../assets/auth/reading-books.webp'
import studyCards from '../../assets/auth/study-cards.webp'
import libraryBooks from '../../assets/auth/library-books.webp'

const slides = [
  { key: 'reading', image: readingBooks },
  { key: 'practice', image: studyCards },
  { key: 'together', image: libraryBooks },
] as const

export function StudySlides() {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const move = (offset: number) => setIndex((current) => (current + offset + slides.length) % slides.length)

  return (
    <section className="auth-slides" aria-label={t('auth.slides.label')}>
      {slides.map(({ key, image }, position) => (
        <img key={key} className="auth-slide-image" data-active={position === index} src={image} alt=""
          fetchPriority={position === 0 ? 'high' : 'low'} decoding="async" />
      ))}
      <div className="auth-slide-shade" aria-hidden="true" />
      <div className="auth-slide-footer">
        <div className="auth-slide-copy" aria-live="polite" aria-atomic="true">
          <h2>{t(`auth.slides.${slide.key}.title`)}</h2>
          <p>{t(`auth.slides.${slide.key}.body`)}</p>
        </div>
        <div className="auth-slide-controls">
          <div className="auth-slide-dots">
            {slides.map(({ key }, position) => (
              <button key={key} type="button" aria-label={t(`auth.slides.${key}.title`)}
                aria-current={position === index ? 'true' : undefined} onClick={() => setIndex(position)} />
            ))}
          </div>
          <div className="auth-slide-arrows">
            <button type="button" onClick={() => move(-1)} aria-label={t('auth.slides.previous')}><Icon name="chevronLeft" size={19} /></button>
            <button type="button" onClick={() => move(1)} aria-label={t('auth.slides.next')}><Icon name="chevronRight" size={19} /></button>
          </div>
        </div>
      </div>
    </section>
  )
}
