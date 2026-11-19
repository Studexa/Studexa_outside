import { call, client } from './client'

export type ReadingSubject = 'SCIENCE' | 'HISTORY' | 'LITERATURE'
export type ReadingAction = 'EXPLAIN' | 'SUMMARIZE' | 'PRACTICE'

export type ReadingEdition = {
  id: string
  title: string
  author: string
  section: string
  subject: ReadingSubject
  revision: number
  sourceUrl: string
  previousId?: string | null
  nextId?: string | null
}

export type Reading = { edition: ReadingEdition; blocks: { heading: boolean; text: string }[]; maxSourceChars: number }

export type SelectionRange = { startBlock: number; startOffset: number; endBlock: number; endOffset: number }

export const readingsApi = {
  list: () => call<ReadingEdition[]>(client.GET('/api/v1/library/readings')),
  get: (id: string) => call<Reading>(client.GET('/api/v1/library/readings/{id}', { params: { path: { id } } })),
  ask: (id: string, body: SelectionRange & { revision: number; language: 'en' | 'km'; action: ReadingAction }) =>
    call<{ answer: string; references: { title: string; excerpt: string }[] }>(
      client.POST('/api/v1/library/readings/{id}/ask', { params: { path: { id } }, body }),
    ),
}
