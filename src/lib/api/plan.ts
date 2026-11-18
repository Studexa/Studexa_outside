import type { Importance, Note, Exam, Task } from '../../lib/store'
import { asBody, call, client } from './client'
import type { components } from './schema'

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

const pathId = (id: string) => ({ path: { id } })

export const notesApi = {
  list: () => call<NoteDto[]>(client.GET('/api/v1/notes')),
  get: (id: string) => call<NoteDto>(client.GET('/api/v1/notes/{id}', { params: pathId(id) })),
  create: (input: NoteInput) =>
    call<NoteDto>(client.POST('/api/v1/notes', { body: asBody(input) })),
  update: (id: string, input: NoteInput) =>
    call<NoteDto>(client.PUT('/api/v1/notes/{id}', { params: pathId(id), body: asBody(input) })),
  remove: (id: string) =>
    call<void>(client.DELETE('/api/v1/notes/{id}', { params: pathId(id) })),
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

type ExamResponse = Omit<ExamDto, 'date' | 'importance'> & { examDate: string; importance: string }

const examImportance = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' } as const

function examBody({ date, importance, ...input }: ExamInput): components['schemas']['ExamRequest'] {
  return { ...input, subject: input.subject ?? undefined, examDate: date, importance: examImportance[importance] }
}

function mapExam({ examDate, importance, ...exam }: ExamResponse): ExamDto {
  return { ...exam, date: examDate, importance: importance.toLowerCase() as Importance }
}

export const examsApi = {
  list: async () => (await call<ExamResponse[]>(client.GET('/api/v1/exams'))).map(mapExam),
  listByRange: async (start: string, end: string) =>
    (await call<ExamResponse[]>(client.GET('/api/v1/exams/range', { params: { query: { start, end } } }))).map(mapExam),
  get: async (id: string) =>
    mapExam(await call<ExamResponse>(client.GET('/api/v1/exams/{id}', { params: pathId(id) }))),
  create: async (input: ExamInput) =>
    mapExam(await call<ExamResponse>(client.POST('/api/v1/exams', { body: examBody(input) }))),
  update: async (id: string, input: ExamInput) =>
    mapExam(await call<ExamResponse>(client.PUT('/api/v1/exams/{id}', { params: pathId(id), body: examBody(input) }))),
  remove: (id: string) =>
    call<void>(client.DELETE('/api/v1/exams/{id}', { params: pathId(id) })),
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

type TaskResponse = Omit<TaskDto, 'date'> & { taskDate: string }

function taskBody({ date, ...input }: TaskInput): components['schemas']['TaskRequest'] {
  return { ...input, taskDate: date }
}

function mapTask({ taskDate, ...task }: TaskResponse): TaskDto {
  return { ...task, date: taskDate }
}

export const tasksApi = {
  list: async (date?: string) =>
    (await call<TaskResponse[]>(client.GET('/api/v1/tasks', { params: { query: { date } } }))).map(mapTask),
  get: async (id: string) =>
    mapTask(await call<TaskResponse>(client.GET('/api/v1/tasks/{id}', { params: pathId(id) }))),
  create: async (input: TaskInput) =>
    mapTask(await call<TaskResponse>(client.POST('/api/v1/tasks', { body: taskBody(input) }))),
  update: async (id: string, input: TaskInput) =>
    mapTask(await call<TaskResponse>(client.PUT('/api/v1/tasks/{id}', { params: pathId(id), body: taskBody(input) }))),
  toggle: async (id: string) =>
    mapTask(await call<TaskResponse>(client.PUT('/api/v1/tasks/{id}/toggle', { params: pathId(id) }))),
  remove: (id: string) => call<void>(client.DELETE('/api/v1/tasks/{id}', { params: pathId(id) })),
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