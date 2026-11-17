import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../lib/i18n'
import { AiPet } from './AiPet'
import { openStudyBuddy } from '../lib/aiStudy'

const state = vi.hoisted(() => ({ tutor: vi.fn(), guest: false, user: { id: 'a' } }))
vi.mock('../lib/api', () => ({ aiApi: { tutor: state.tutor } }))
vi.mock('../lib/auth', () => ({ isGuestMode: () => state.guest, useAuth: (select: (value: unknown) => unknown) => select({ user: state.user }) }))
vi.mock('../lib/store', () => ({ useApp: (select: (value: unknown) => unknown) => select({ buddy: 'cat' }) }))
vi.mock('./Mascot', () => ({ Mascot: () => <span /> }))

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><AiPet /></QueryClientProvider>)
  return { ...view, client }
}
beforeEach(() => {
  state.tutor.mockReset()
  state.guest = false
  state.user = { id: 'a' }
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
})
afterEach(cleanup)

describe('AI study buddy', () => {
  it('attaches notes and drafts prompts without sending until the student submits', async () => {
    state.tutor.mockResolvedValue({ answer: 'Plants use light.', references: [] })
    setup()
    act(() => openStudyBuddy({ title: 'Biology', text: 'Plants use sunlight.' }))
    expect((screen.getByLabelText('Attached notes') as HTMLTextAreaElement).value).toBe('Plants use sunlight.')
    fireEvent.click(screen.getByRole('button', { name: 'Explain simply' }))
    expect(state.tutor).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Plants use light.')
    expect(state.tutor).toHaveBeenCalledWith(expect.objectContaining({ sourceTitle: 'Biology', sourceText: 'Plants use sunlight.' }))
  })

  it('retries the failed source snapshot without duplicating the question', async () => {
    state.tutor.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ answer: 'Recovered answer', references: [] })
    setup()
    act(() => openStudyBuddy({ title: 'Original', text: 'Original notes' }))
    fireEvent.change(screen.getByLabelText('Ask me about your lesson...'), { target: { value: 'Explain photosynthesis' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByRole('button', { name: 'Retry this question' })
    fireEvent.change(screen.getByLabelText('Attached notes'), { target: { value: 'Edited notes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Retry this question' }))
    await screen.findByText('Recovered answer')
    expect(state.tutor.mock.calls[1][0]).toEqual(state.tutor.mock.calls[0][0])
    expect(screen.getAllByText('Explain photosynthesis')).toHaveLength(1)
  })

  it('makes no AI requests in guest mode', () => {
    state.guest = true
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Open AI study pet' }))
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(state.tutor).not.toHaveBeenCalled()
  })

  it('keeps the draft offline and allows submission after reconnecting', async () => {
    state.tutor.mockResolvedValue({ answer: 'Online answer', references: [] })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Open AI study pet' }))
    fireEvent.change(screen.getByLabelText('Ask me about your lesson...'), { target: { value: 'My draft' } })
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    act(() => window.dispatchEvent(new Event('offline')))
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true)
    expect(state.tutor).not.toHaveBeenCalled()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    act(() => window.dispatchEvent(new Event('online')))
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Online answer')
  })

  it('clears private drafts on account changes', async () => {
    const view = setup()
    act(() => openStudyBuddy({ title: 'Private', text: 'Private notes' }))
    state.user = { id: 'b' }
    view.rerender(<QueryClientProvider client={view.client}><AiPet /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Open AI study pet' }))
    await waitFor(() => expect(screen.queryByDisplayValue('Private notes')).toBeNull())
  })
})
