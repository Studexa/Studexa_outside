import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import type { Slide } from '../../lib/api/slides'
import './slides.css'

export function SlidePresenter({ slides }: { slides: Slide[] }) {
  const { t } = useTranslation()
  const [position, setPosition] = useState(0)
  const id = useId()
  const slide = slides[position]
  const move = (step: number) => setPosition((index) => Math.min(slides.length - 1, Math.max(0, index + step)))

  function handleKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  return <section className="slide-presenter study-panel" aria-labelledby={id} onKeyDown={handleKeyboard} tabIndex={0}>
    <div className="slide-canvas" aria-live="polite" aria-atomic="true">
      <p className="study-muted tabular-nums">{t('slides.position', { index: position + 1, total: slides.length })}</p>
      <h2 id={id}>{slide.title}</h2>
      <ul>{slide.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>
    </div>
    <div className="slide-controls">
      <Button variant="secondary" aria-disabled={position === 0} onClick={() => move(-1)}>{t('slides.previous')}</Button>
      <Button variant="secondary" aria-disabled={position === slides.length - 1} onClick={() => move(1)}>{t('slides.next')}</Button>
    </div>
  </section>
}
