import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { notesApi, examsApi, tasksApi } from './api/plan'
import { focusSessionsApi } from './api/focus'
import { bossFightsApi } from './api/boss'

export type BuddySpecies = 'owl' | 'cat' | 'fox' | 'elephant'
export type LevelOfStudy = 'middle' | 'highschool' | 'university' | 'self'
export type CardType = 'basic' | 'reverse' | 'cloze' | 'choice'
export type Importance = 'low' | 'medium' | 'high'
export type QuestCode = 'warmup' | 'focus' | 'builder'

export type Card = {
  id: string
  front: string
  back: string
  type: CardType
  due: boolean
  lapses: number
}

export type Deck = {
  id: string
  title: string
  subject: string
  icon: string
  color: string
  cards: Card[]
}

export type Note = {
  id: string
  title: string
  content: string
  subject: string
  updatedAt: string
}

export type Exam = {
  id: string
  title: string
  subject: string
  date: string
  importance: Importance
}

export type Task = {
  id: string
  title: string
  date: string
  done: boolean
}

export type FocusSession = {
  id: string
  minutes: number
  completedAt: string
}

export type BossFight = {
  id: string
  won: boolean
  questionsCount: number
  heartsRemaining: number
  completedAt: string
}

export type Quest = {
  id: QuestCode
  target: number
  progress: number
  rewardXp: number
  rewardCoins: number
  completed: boolean
}

export type ShopItem = {
  id: string
  nameKey: string
  price: number
  kind: 'accessory' | 'theme' | 'freeze'
  accessory?: 'hat' | 'glasses' | 'scarf' | 'cape'
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat', nameKey: 'profile.items.hat', price: 60, kind: 'accessory', accessory: 'hat' },
  { id: 'glasses', nameKey: 'profile.items.glasses', price: 80, kind: 'accessory', accessory: 'glasses' },
  { id: 'scarf', nameKey: 'profile.items.scarf', price: 70, kind: 'accessory', accessory: 'scarf' },
  { id: 'cape', nameKey: 'profile.items.cape', price: 150, kind: 'accessory', accessory: 'cape' },
  { id: 'freeze', nameKey: 'profile.items.freeze', price: 50, kind: 'freeze' },
  { id: 'themeOcean', nameKey: 'profile.items.themeOcean', price: 120, kind: 'theme' },
]

export const BADGES = [
  { code: 'firstFlip', coins: 10 },
  { code: 'collector', coins: 30 },
  { code: 'century', coins: 30 },
  { code: 'memory', coins: 100 },
  { code: 'weekWarrior', coins: 50 },
  { code: 'monthMonarch', coins: 200 },
  { code: 'focusHero', coins: 40 },
  { code: 'nightOwl', coins: 20 },
  { code: 'perfect', coins: 40 },
  { code: 'bossSlayer', coins: 60 },
  { code: 'noteNinja', coins: 30 },
  { code: 'quizWhiz', coins: 40 },
  { code: 'comeback', coins: 25 },
  { code: 'explorer', coins: 30 },
  { code: 'polyglot', coins: 10 },
] as const

export function xpForNext(level: number) {
  return 100 + (level - 1) * 50
}

export function levelTitleKey(level: number): string {
  if (level >= 30) return 'wisdom'
  if (level >= 20) return 'knight'
  if (level >= 15) return 'builder'
  if (level >= 10) return 'hunter'
  if (level >= 5) return 'page'
  return 'curious'
}

export function buddyStageKey(level: number): string {
  if (level >= 20) return 'legend'
  if (level >= 10) return 'grown'
  if (level >= 5) return 'young'
  return 'baby'
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function isoInDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(iso: string) {
  const target = new Date(`${iso}T23:59:59`)
  const diff = target.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

let seq = 0
function uid(prefix: string) {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq}`
}

function isGuestStore(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('studexa_guest_mode') === 'true'
}

function card(front: string, back: string, type: CardType = 'basic', due = true, lapses = 0): Card {
  return { id: uid('card'), front, back, type, due, lapses }
}

const seedDecks: Deck[] = [
  {
    id: 'deck-algebra',
    title: 'Algebra Essentials',
    subject: 'Mathematics',
    icon: '∑',
    color: '#6366f1',
    cards: [
      card('Solve: 2x + 6 = 18', 'x = 6', 'basic', true, 1),
      card('Slope of the line y = 3x + 2', '3', 'basic', true, 0),
      card('Factor x² − 9', '(x − 3)(x + 3)', 'basic', true, 2),
      card('Area of a circle', 'πr²', 'basic', true, 0),
      card('Solve: x² = 49', 'x = ±7', 'basic', false, 1),
      card('Value of π to 2 decimal places', '3.14', 'basic', true, 0),
    ],
  },
  {
    id: 'deck-khmer',
    title: 'Khmer Literature',
    subject: 'Khmer',
    icon: 'ក',
    color: '#f59e0b',
    cards: [
      card('Who wrote “Tum Teav”?', 'Preah Botumthera Som', 'basic', true, 1),
      card('What is a “Reamker”?', 'The Khmer version of the Ramayana', 'basic', true, 0),
      card('“ជើង” means…', 'Foot / leg', 'basic', true, 0),
      card('“ស្រលាញ់” means…', 'To love', 'basic', false, 2),
    ],
  },
  {
    id: 'deck-biology',
    title: 'Cell Biology',
    subject: 'Biology',
    icon: '🧬',
    color: '#10b981',
    cards: [
      card('Powerhouse of the cell', 'Mitochondria', 'basic', true, 0),
      card('Process plants use to make food', 'Photosynthesis', 'basic', true, 1),
      card('DNA base pairs', 'A–T and C–G', 'basic', true, 0),
      card('Largest organ in the human body', 'The skin', 'basic', false, 0),
      card('Part of the cell that stores DNA', 'The nucleus', 'basic', true, 2),
    ],
  },
  {
    id: 'deck-english',
    title: 'English Vocabulary',
    subject: 'English',
    icon: 'Aa',
    color: '#f87171',
    cards: [
      card("Past tense of “go”", 'went', 'basic', true, 0),
      card('Synonym of “happy”', 'joyful', 'basic', true, 0),
      card('Plural of “child”', 'children', 'basic', true, 1),
      card('Meaning of “brave”', 'Courageous, not afraid', 'basic', false, 0),
    ],
  },
  {
    id: 'deck-physics',
    title: 'Physics Basics',
    subject: 'Physics',
    icon: '⚛',
    color: '#3b82f6',
    cards: [
      card('Formula for speed', 'distance ÷ time', 'basic', true, 0),
      card('Unit of force', 'Newton (N)', 'basic', true, 0),
      card('Gravity on Earth', '9.8 m/s²', 'basic', true, 1),
      card('Energy stored in motion', 'Kinetic energy', 'basic', false, 0),
    ],
  },
]

const seedNotes: Note[] = [
  {
    id: 'note-cells',
    title: 'Cell biology summary',
    subject: 'Biology',
    updatedAt: new Date().toISOString(),
    content:
      '<h2>Cells</h2><p>Cells are the smallest living unit. The <strong>nucleus</strong> stores DNA and the <strong>mitochondria</strong> release energy.</p><ul><li>Cell membrane controls what enters.</li><li>Cytoplasm holds the organelles.</li><li>Plant cells also have a cell wall and chloroplasts.</li></ul><p>Remember: photosynthesis happens in the chloroplast.</p>',
  },
  {
    id: 'note-algebra',
    title: 'Algebra formula sheet',
    subject: 'Mathematics',
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    content:
      '<h2>Quick formulas</h2><ul><li>Slope: <strong>m = (y₂ − y₁) / (x₂ − x₁)</strong></li><li>Quadratic: <strong>x = (−b ± √(b² − 4ac)) / 2a</strong></li><li>Circle area: <strong>πr²</strong></li></ul><p>Practice the quadratic formula before Friday.</p>',
  },
  {
    id: 'note-khmer',
    title: 'Khmer vocabulary — family',
    subject: 'Khmer',
    updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    content:
      '<h2>គ្រួសារ (Family)</h2><ul><li>ម្តាយ — mother</li><li>ឪពុក — father</li><li>បង — older sibling</li><li>ប្អូន — younger sibling</li></ul>',
  },
]

const seedQuests: Quest[] = [
  { id: 'warmup', target: 10, progress: 6, rewardXp: 15, rewardCoins: 5, completed: false },
  { id: 'focus', target: 1, progress: 0, rewardXp: 25, rewardCoins: 8, completed: false },
  { id: 'builder', target: 3, progress: 1, rewardXp: 15, rewardCoins: 5, completed: false },
]

const seedBadges: Record<string, boolean> = {
  firstFlip: true,
  collector: false,
  century: true,
  memory: false,
  weekWarrior: true,
  monthMonarch: false,
  focusHero: false,
  nightOwl: false,
  perfect: false,
  bossSlayer: false,
  noteNinja: true,
  quizWhiz: false,
  comeback: false,
  explorer: true,
  polyglot: true,
}

type State = {
  onboarded: boolean
  nickname: string
  buddy: BuddySpecies
  levelOfStudy: LevelOfStudy
  dailyGoal: number
  cardsToday: number
  level: number
  xp: number
  coins: number
  streak: number
  bestStreak: number
  joinedAt: string
  decks: Deck[]
  notes: Note[]
  exams: Exam[]
  tasks: Task[]
  focusSessions: FocusSession[]
  bossFights: BossFight[]
  loading: {
    notes: boolean
    exams: boolean
    tasks: boolean
    focus: boolean
    boss: boolean
  }
  quests: Quest[]
  badges: Record<string, boolean>
  owned: string[]
  equipped: string | null
  weakCards: { id: string; front: string; back: string; lapses: number; deck: string }[]
  finishOnboarding: (payload: {
    nickname: string
    buddy: BuddySpecies
    levelOfStudy: LevelOfStudy
    dailyGoal: number
    language: string
  }) => void
  setNickname: (nickname: string) => void
  replayOnboarding: () => void
  addXp: (amount: number) => { leveledUp: boolean; level: number }
  recordReviewSession: (cards: number, correct: number) => void
  recordQuiz: (correct: number, total: number) => void
  addQuestProgress: (code: QuestCode, amount: number) => void
  addDeck: (deck: Omit<Deck, 'id' | 'cards'>) => string
  addCard: (deckId: string, front: string, back: string, type?: CardType) => void
  deleteCard: (deckId: string, cardId: string) => void
  reviewGuestCard: (cardId: string, again: boolean) => void
  loadNotes: () => Promise<void>
  addNote: (note: Omit<Note, 'id' | 'updatedAt'>) => Promise<string>
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'subject'>>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  loadExams: () => Promise<void>
  addExam: (exam: Omit<Exam, 'id'>) => Promise<string>
  removeExam: (id: string) => Promise<void>
  loadTasks: (date?: string) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  addTask: (title: string, date: string) => Promise<string>
  loadFocusSessions: () => Promise<void>
  recordFocus: (minutes: number) => Promise<void>
  loadBossFights: () => Promise<void>
  recordBoss: () => Promise<void>
  buyItem: (item: Pick<ShopItem, 'id' | 'price'> & { accessory?: ShopItem['accessory'] }) => boolean
  equipItem: (accessory: string | null) => void
  resetAll: () => void
}

function freshQuests(): Quest[] {
  return seedQuests.map((q) => ({ ...q, progress: 0, completed: false }))
}

function freshBadges(): Record<string, boolean> {
  return Object.fromEntries(Object.keys(seedBadges).map((code) => [code, false]))
}

const initialState = {
  onboarded: false,
  nickname: 'Sokha',
  buddy: 'owl' as BuddySpecies,
  levelOfStudy: 'highschool' as LevelOfStudy,
  dailyGoal: 10,
  cardsToday: 0,
  level: 1,
  xp: 0,
  coins: 0,
  streak: 0,
  bestStreak: 0,
  joinedAt: isoInDays(0),
  decks: seedDecks,
  notes: seedNotes,
  exams: [],
  tasks: [],
  focusSessions: [],
  bossFights: [],
  loading: { notes: false, exams: false, tasks: false, focus: false, boss: false },
  quests: freshQuests(),
  badges: freshBadges(),
  owned: [] as string[],
  equipped: null as string | null,
  weakCards: [],
}

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      ...initialState,

      finishOnboarding: ({ nickname, buddy, levelOfStudy, dailyGoal }) =>
        set({ onboarded: true, nickname: nickname.trim() || 'Sokha', buddy, levelOfStudy, dailyGoal }),

      setNickname: (nickname) => set({ nickname: nickname.trim() || get().nickname }),

      replayOnboarding: () => set({ onboarded: false }),

      addXp: (amount) => {
        const gained = Math.max(0, amount)
        let { level, xp, coins } = get()
        xp += gained
        let leveledUp = false
        while (xp >= xpForNext(level)) {
          xp -= xpForNext(level)
          level += 1
          coins += 20
          leveledUp = true
        }
        if (gained > 0) coins += Math.floor(gained / 10)
        set({ level, xp, coins })
        return { leveledUp, level }
      },

      recordReviewSession: (cards, correct) => {
        const state = get()
        const xp = cards * 3 + correct * 2 + (cards >= 5 ? 20 : 0)
        state.addXp(xp)
        set({ cardsToday: state.cardsToday + cards })
        get().addQuestProgress('warmup', cards)
      },

      recordQuiz: (correct, total) => {
        const questionCount = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0
        if (questionCount === 0) return
        const correctCount = Number.isFinite(correct)
          ? Math.min(questionCount, Math.max(0, Math.trunc(correct)))
          : 0
        get().addXp(10 + correctCount * 2 + (correctCount === questionCount ? 20 : 0))
      },

      addQuestProgress: (code, amount) => {
        const quests = get().quests.map((q) => {
          if (q.id !== code || q.completed) return q
          const progress = Math.min(q.target, q.progress + amount)
          const completed = progress >= q.target
          return { ...q, progress, completed }
        })
        const finished = quests.find((q) => q.id === code && q.completed)
        const already = get().quests.find((q) => q.id === code)?.completed
        set({ quests })
        if (finished && !already) {
          get().addXp(finished.rewardXp)
          set({ coins: get().coins + finished.rewardCoins })
        }
      },

      addDeck: (deck) => {
        const id = uid('deck')
        set({ decks: [...get().decks, { ...deck, id, cards: [] }] })
        return id
      },

      addCard: (deckId, front, back, type = 'basic') => {
        const newCard = card(front, back, type, true, 0)
        set({
          decks: get().decks.map((d) =>
            d.id === deckId ? { ...d, cards: [...d.cards, newCard] } : d,
          ),
        })
        get().addQuestProgress('builder', 1)
        get().addXp(2)
      },

      deleteCard: (deckId, cardId) =>
        set({
          decks: get().decks.map((d) =>
            d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
          ),
        }),

      reviewGuestCard: (cardId, again) => set({
        decks: get().decks.map((deck) => ({
          ...deck,
          cards: deck.cards.map((item) => item.id === cardId
            ? { ...item, due: again, lapses: item.lapses + (again ? 1 : 0) }
            : item),
        })),
      }),

      loadNotes: async () => {
        if (isGuestStore()) return
        set({ loading: { ...get().loading, notes: true } })
        try {
          const dtos = await notesApi.list()
          set({ notes: dtos.map((d) => ({ id: d.id, title: d.title, content: d.content, subject: d.subject ?? '', updatedAt: d.updatedAt })) })
        } finally {
          set({ loading: { ...get().loading, notes: false } })
        }
      },

      addNote: async (note) => {
        if (isGuestStore()) {
          const stored = { ...note, id: uid('note'), updatedAt: new Date().toISOString() }
          set({ notes: [stored, ...get().notes] })
          get().addXp(5)
          return stored.id
        }
        const dto = await notesApi.create({ title: note.title, content: note.content, subject: note.subject })
        const stored = { id: dto.id, title: dto.title, content: dto.content, subject: dto.subject ?? '', updatedAt: dto.updatedAt }
        set({ notes: [stored, ...get().notes] })
        get().addXp(5)
        return stored.id
      },

      updateNote: async (id, patch) => {
        const current = get().notes.find((note) => note.id === id)
        if (!current) return
        const updated = { ...current, ...patch, updatedAt: new Date().toISOString() }
        if (!isGuestStore()) await notesApi.update(id, {
          title: updated.title,
          content: updated.content,
          subject: updated.subject,
        })
        set({
          notes: get().notes.map((n) =>
            n.id === id ? updated : n,
          ),
        })
      },

      deleteNote: async (id) => {
        if (!isGuestStore()) await notesApi.remove(id)
        set({ notes: get().notes.filter((n) => n.id !== id) })
      },

      loadExams: async () => {
        if (isGuestStore()) return
        set({ loading: { ...get().loading, exams: true } })
        try {
          const dtos = await examsApi.list()
          set({ exams: dtos.map((d) => ({ id: d.id, title: d.title, subject: d.subject ?? '', date: d.date, importance: d.importance })) })
        } finally {
          set({ loading: { ...get().loading, exams: false } })
        }
      },

      addExam: async (exam) => {
        if (isGuestStore()) {
          const stored = { ...exam, id: uid('exam') }
          set({ exams: [stored, ...get().exams] })
          return stored.id
        }
        const dto = await examsApi.create({ title: exam.title, subject: exam.subject, date: exam.date, importance: exam.importance })
        const stored = { id: dto.id, title: dto.title, subject: dto.subject ?? '', date: dto.date, importance: dto.importance }
        set({ exams: [stored, ...get().exams] })
        return stored.id
      },

      removeExam: async (id) => {
        if (!isGuestStore()) await examsApi.remove(id)
        set({ exams: get().exams.filter((e) => e.id !== id) })
      },

      loadTasks: async (date?: string) => {
        if (isGuestStore()) return
        set({ loading: { ...get().loading, tasks: true } })
        try {
          const dtos = await tasksApi.list(date)
          set({ tasks: dtos.map((d) => ({ id: d.id, title: d.title, date: d.date, done: d.done })) })
        } finally {
          set({ loading: { ...get().loading, tasks: false } })
        }
      },

      toggleTask: async (id) => {
        if (isGuestStore()) {
          set({ tasks: get().tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) })
          return
        }
        const dto = await tasksApi.toggle(id)
        set({
          tasks: get().tasks.map((t) => (t.id === id ? { ...t, done: dto.done } : t)),
        })
      },

      addTask: async (title, date) => {
        if (isGuestStore()) {
          const stored = { id: uid('task'), title, date, done: false }
          set({ tasks: [stored, ...get().tasks] })
          return stored.id
        }
        const dto = await tasksApi.create({ title, date })
        const stored = { id: dto.id, title: dto.title, date: dto.date, done: dto.done }
        set({ tasks: [stored, ...get().tasks] })
        return stored.id
      },

      loadFocusSessions: async () => {
        if (isGuestStore()) return
        set({ loading: { ...get().loading, focus: true } })
        try {
          const dtos = await focusSessionsApi.list()
          set({ focusSessions: dtos.map((d) => ({ id: d.id, minutes: d.minutes, completedAt: d.completedAt })) })
        } finally {
          set({ loading: { ...get().loading, focus: false } })
        }
      },

      recordFocus: async (minutes) => {
        const now = new Date().toISOString()
        if (isGuestStore()) {
          set({ focusSessions: [{ id: uid('focus'), minutes, completedAt: now }, ...get().focusSessions] })
          get().addXp(Math.round(25 * Math.min(1, minutes / 25)))
          get().addQuestProgress('focus', 1)
          return
        }
        const dto = await focusSessionsApi.create({ minutes, completedAt: now })
        const stored = { id: dto.id, minutes: dto.minutes, completedAt: dto.completedAt }
        set({ focusSessions: [stored, ...get().focusSessions] })
        get().addXp(Math.round(25 * Math.min(1, minutes / 25)))
        get().addQuestProgress('focus', 1)
      },

      loadBossFights: async () => {
        if (isGuestStore()) return
        set({ loading: { ...get().loading, boss: true } })
        try {
          const dtos = await bossFightsApi.list()
          set({ bossFights: dtos.map((d) => ({ id: d.id, won: d.won, questionsCount: d.questionsCount, heartsRemaining: d.heartsRemaining, completedAt: d.completedAt })) })
        } finally {
          set({ loading: { ...get().loading, boss: false } })
        }
      },

      recordBoss: async () => {
        if (isGuestStore()) {
          set({ bossFights: [{ id: uid('boss'), won: true, questionsCount: 5, heartsRemaining: 3, completedAt: new Date().toISOString() }, ...get().bossFights] })
          get().addXp(100)
          set({ badges: { ...get().badges, bossSlayer: true } })
          return
        }
        const dto = await bossFightsApi.create({ won: true, questionsCount: 5, heartsRemaining: 3, completedAt: new Date().toISOString() })
        const stored = { id: dto.id, won: dto.won, questionsCount: dto.questionsCount, heartsRemaining: dto.heartsRemaining, completedAt: dto.completedAt }
        set({ bossFights: [stored, ...get().bossFights] })
        get().addXp(100)
        set({ badges: { ...get().badges, bossSlayer: true } })
      },

      buyItem: (item) => {
        const { coins, owned } = get()
        const alreadyOwnedCount = owned.filter((id) => id === item.id).length
        if ((item.id === 'freeze' ? alreadyOwnedCount >= 2 : alreadyOwnedCount > 0) || coins < item.price) return false
        set({
          coins: coins - item.price,
          owned: [...owned, item.id],
          equipped: item.accessory ?? get().equipped,
        })
        return true
      },

      equipItem: (accessory) => set({ equipped: accessory }),

      resetAll: () => {
        localStorage.removeItem('studexa_v1')
        set({ ...initialState, quests: freshQuests(), badges: freshBadges() })
      },
    }),
    { name: 'studexa_v1', version: 1 },
  ),
)
