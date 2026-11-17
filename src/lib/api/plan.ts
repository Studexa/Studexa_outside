import type { Importance, Note, Exam, Task } from '../../lib/store'

const API_BASE = '/api/v1'

type RequestInitWithJson = Omit<RequestInit, 'body'> & { body?: unknown }

async function request<T>(path: string, init: RequestInitWithJson = {}): Promise<T> {
  const url = `${API_BASE}${path}`

  const send = (token: string | null) =>
    fetch(url, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })

  // Access token is read from a small in-memory store; we import it lazily
  // to avoid a circular dependency with api/client.ts.
  let accessToken: string | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAccessToken } = require('./client')
    accessToken = getAccessToken()
  } catch {}

  let res = await send(accessToken)

  if (res.status === 401) {
    try {
      const { refreshAccessToken } = require('./client')
      const token = await refreshAccessToken()
      if (token) res = await send(token)
    } catch {}
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string; message?: string }
    throw new Error(err.detail || err.message || `Request failed: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Notes */
export type NoteDto = {
  id: string
  title: string
  content: string
  subject: string | null
  updatedAt: string
  createdAt: string
}

export type NoteInput = {
  title: string
  content?: string
  subject?: string | null
}

export const notesApi = {
  list: () => request<NoteDto[]>('/notes'),
  get: (id: string) => request<NoteDto>(`/notes/${id}`),
  create: (input: NoteInput) => request<NoteDto>('/notes', { method: 'POST', body: input }),
  update: (id: string, input: NoteInput) =>
    request<NoteDto>(`/notes/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
}

/** Exams */
export type ExamDto = {
  id: string
  title: string
  subject: string | null
  date: string
  importance: Importance
  updatedAt: string
  createdAt: string
}

export type ExamInput = {
  title: string
  subject?: string | null
  date: string
  importance: Importance
}

export const examsApi = {
  list: () => request<ExamDto[]>('/exams'),
  listByRange: (start: string, end: string) =>
    request<ExamDto[]>(`/exams/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  get: (id: string) => request<ExamDto>(`/exams/${id}`),
  create: (input: ExamInput) => request<ExamDto>('/exams', { method: 'POST', body: input }),
  update: (id: string, input: ExamInput) =>
    request<ExamDto>(`/exams/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => request<void>(`/exams/${id}`, { method: 'DELETE' }),
}

/** Tasks */
export type TaskDto = {
  id: string
  title: string
  date: string
  done: boolean
  updatedAt: string
  createdAt: string
}

export type TaskInput = {
  title: string
  date: string
  done?: boolean
}

export const tasksApi = {
  list: (date?: string) =>
    request<TaskDto[]>(date ? `/tasks?date=${encodeURIComponent(date)}` : '/tasks'),
  get: (id: string) => request<TaskDto>(`/tasks/${id}`),
  create: (input: TaskInput) => request<TaskDto>('/tasks', { method: 'POST', body: input }),
  update: (id: string, input: TaskInput) =>
    request<TaskDto>(`/tasks/${id}`, { method: 'PUT', body: input }),
  toggle: (id: string) => request<TaskDto>(`/tasks/${id}/toggle`, { method: 'PUT' }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
}

// Helper: map backend DTO to store type
export function toStoreNote(dto: NoteDto): Note {
  return {
    id: dto.id,
    title: dto.title,
    content: dto.content,
    subject: dto.subject ?? '',
    updatedAt: dto.updatedAt,
  }
}

export function toStoreExam(dto: ExamDto): Exam {
  return {
    id: dto.id,
    title: dto.title,
    subject: dto.subject ?? '',
    date: dto.date,
    importance: dto.importance,
  }
}

export function toStoreTask(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    date: dto.date,
    done: dto.done,
  }
}