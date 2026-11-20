import { asBody, call, client } from './client'

export type Slide = { title: string; bullets: string[] }
export type SlideDraft = {
  id: string
  content: {
    title: string
    slides: Slide[]
    questions: { question: string; choices: string[]; correctIndex: number; explanation: string }[]
  }
}
type DeckSummary = { id: string; title: string; createdAt: string }
export type SlideDeck = DeckSummary & { quizId: string; slides: Slide[] }

export const slidesApi = {
  list: () => call<DeckSummary[]>(client.GET('/api/v1/slide-decks')),
  get: (id: string) => call<SlideDeck>(client.GET('/api/v1/slide-decks/{id}', { params: { path: { id } } })),
  save: (draft: SlideDraft) => call<SlideDeck>(client.POST('/api/v1/slide-decks', { body: draft })),
  extract: (file: File) => {
    const form = new FormData()
    form.set('file', file)
    return call<{ text: string; truncated: boolean }>(client.POST('/api/v1/ai/slides/extract', {
      body: asBody({ file }), bodySerializer: () => form,
    }))
  },
  generate: (body: { mode: 'PROMPT' | 'SOURCE'; text: string; language: 'en' | 'km' }) =>
    call<SlideDraft>(client.POST('/api/v1/ai/slides/generate', { body })),
  sample: (sampleId: string) => call<SlideDraft>(client.POST('/api/v1/ai/samples/slides', { body: { sampleId } })),
}
