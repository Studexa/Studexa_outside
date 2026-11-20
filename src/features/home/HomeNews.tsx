import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { openStudyCompanion } from '../../lib/aiStudy'
import { useSettings } from '../../lib/useSettings'
import { dailyReadingPicks, useReadingEditions } from '../explore/useReadingEditions'

const announcements = ['tutor', 'practice'] as const
const rotationMs = 8000
const motionPreference = '(prefers-reduced-motion: reduce)'

export function HomeNews({ date, tutorAvailable }: { date: Date; tutorAvailable: boolean }) {
  const { t } = useTranslation()
  const { data } = useReadingEditions()
  const { reducedMotion } = useSettings()
  const [deviceReducedMotion, setDeviceReducedMotion] = useState(() => Boolean(window.matchMedia?.(motionPreference).matches))
  const [activeId, setActiveId] = useState<string>(announcements[0])
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const playbackOnPointerDown = useRef<boolean | undefined>(undefined)
  const slides = [
    ...announcements.map((id) => ({ id, kind: 'announcement' as const })),
    ...dailyReadingPicks(data ?? [], date).map((edition) => ({ id: 'book-' + edition.id, kind: 'book' as const, edition })),
  ]
  const current = Math.max(0, slides.findIndex(({ id }) => id === activeId))
  const slide = slides[current]
  const motionDisabled = reducedMotion || deviceReducedMotion
  const rotating = !motionDisabled && !paused && !hovered && !hidden && slides.length > 1
  const nextId = slides[(current + 1) % slides.length].id

  useEffect(() => {
    const preference = window.matchMedia?.(motionPreference)
    const onMotionChange = () => setDeviceReducedMotion(Boolean(preference?.matches))
    const onVisibilityChange = () => setHidden(document.hidden)
    preference?.addEventListener('change', onMotionChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      preference?.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!rotating) return
    const timer = window.setTimeout(() => setActiveId(nextId), rotationMs)
    return () => window.clearTimeout(timer)
  }, [rotating, nextId, slide.id])

  function move(offset: number) {
    setPaused(true)
    setActiveId(slides[(current + offset + slides.length) % slides.length].id)
  }

  return (
    <section className="study-panel home-news" aria-labelledby="home-news-title"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(true) }}>
      <div className="home-news-heading">
        <h2 className="study-section-title" id="home-news-title">{t('homeNews.title')}</h2>
        {slides.length > 1 && <div className="home-news-controls">
          {!motionDisabled && <Button type="button" size="sm" variant="ghost"
            aria-label={t(paused ? 'homeNews.play' : 'homeNews.pause')}
            onPointerDown={() => { playbackOnPointerDown.current = paused }}
            onClick={(event) => {
              setPaused(!(event.detail ? playbackOnPointerDown.current ?? paused : paused))
              playbackOnPointerDown.current = undefined
            }}><Icon name={paused ? 'play' : 'pause'} size={16} /></Button>}
          <Button type="button" size="sm" variant="ghost" aria-label={t('homeNews.previous')} onClick={() => move(-1)}><Icon name="chevronLeft" size={17} /></Button>
          <Button type="button" size="sm" variant="ghost" aria-label={t('homeNews.next')} onClick={() => move(1)}><Icon name="chevronRight" size={17} /></Button>
        </div>}
      </div>
      <div aria-live={rotating ? 'off' : 'polite'}>
        <article className="home-news-slide" data-kind={slide.kind} data-motion={!motionDisabled} key={slide.id}>
          <span className="home-news-icon" aria-hidden="true"><Icon name={slide.kind === 'book' ? 'book' : slide.id === 'tutor' ? 'sparkles' : 'cards'} size={24} /></span>
          {slide.kind === 'book' ? <div>
            <p className="home-news-category">{t('homeNews.featuredBook')}</p>
            <h3>{slide.edition.title}</h3>
            <p>{slide.edition.author} · {slide.edition.section}</p>
            <Link className="study-text-link" to={'/explore/read/' + slide.edition.id}>{t('reading.read')} <Icon name="arrowRight" size={16} /></Link>
          </div> : <div>
            <p className="home-news-category">{t('homeNews.update')}</p>
            <h3>{t(`homeNews.${slide.id}.title`)}</h3>
            <p>{t(`homeNews.${slide.id}.description`)}</p>
            {slide.id === 'tutor' && tutorAvailable && <button type="button" className="study-text-link" aria-haspopup="dialog"
              onClick={(event) => openStudyCompanion(event.currentTarget)}>{t('homeNews.tutor.action')} <Icon name="arrowRight" size={16} /></button>}
            {slide.id === 'practice' && <Link className="study-text-link" to="/stats">{t('homeNews.practice.action')} <Icon name="arrowRight" size={16} /></Link>}
          </div>}
        </article>
      </div>
    </section>
  )
}
