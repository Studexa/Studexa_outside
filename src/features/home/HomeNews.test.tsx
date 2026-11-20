import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../lib/i18n'
import type { ReadingEdition } from '../../lib/api/readings'
import { HomeNews } from './HomeNews'

const state = vi.hoisted(() => ({ catalog: undefined as ReadingEdition[] | undefined, reducedMotion: false }))
vi.mock('../../lib/useSettings', () => ({ useSettings: () => ({ reducedMotion: state.reducedMotion }) }))
vi.mock('../explore/useReadingEditions', async (importOriginal) => ({
  ...await importOriginal<typeof import('../explore/useReadingEditions')>(),
  useReadingEditions: () => ({ data: state.catalog }),
}))

function showNews(tutorAvailable = true) {
  render(<MemoryRouter><HomeNews date={new Date(2026, 10, 19)} tutorAvailable={tutorAvailable} /></MemoryRouter>)
}

const tick = (ms = 8000) => act(() => vi.advanceTimersByTime(ms))
const heading = () => screen.getByRole('heading', { level: 3 }).textContent

beforeEach(() => {
  vi.useFakeTimers()
  state.catalog = undefined
  state.reducedMotion = false
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Home news', () => {
  it('rotates and loops through announcements when the reading catalog is unavailable', () => {
    showNews(false)
    expect(heading()).toBe('Meet the new AI tutor')
    expect(screen.queryByRole('button', { name: 'Open tutor' })).toBeNull()
    tick(7999)
    expect(heading()).toBe('Meet the new AI tutor')
    tick(1)
    expect(heading()).toBe('Practice cards you’ve missed')
    expect(screen.getByRole('link', { name: 'See cards in Stats' }).getAttribute('href')).toBe('/stats')
    tick()
    expect(heading()).toBe('Meet the new AI tutor')
  })

  it('pauses on focus and manual navigation and links to the reader', () => {
    state.catalog = [{ id: 'sample', title: 'Sample book', author: 'Sample author', section: 'First chapter', subject: 'SCIENCE', revision: 1, sourceUrl: '' }]
    showNews()
    act(() => screen.getByRole('button', { name: 'Next slide' }).focus())
    tick()
    expect(heading()).toBe('Meet the new AI tutor')
    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }))
    expect(heading()).toBe('Sample book')
    expect(screen.getByRole('link', { name: 'Read passage' }).getAttribute('href')).toBe('/explore/read/sample')
    tick()
    expect(heading()).toBe('Sample book')
    fireEvent.click(screen.getByRole('button', { name: 'Play slides' }))
    tick()
    expect(heading()).toBe('Meet the new AI tutor')
  })

  it('suspends autoplay in a hidden tab and with reduced motion', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    showNews()
    tick()
    expect(heading()).toBe('Meet the new AI tutor')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    tick()
    expect(heading()).toBe('Practice cards you’ve missed')
    cleanup()

    state.reducedMotion = true
    showNews()
    tick()
    expect(heading()).toBe('Meet the new AI tutor')
    expect(screen.queryByRole('button', { name: /Pause slides|Play slides/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(heading()).toBe('Practice cards you’ve missed')
  })
})
