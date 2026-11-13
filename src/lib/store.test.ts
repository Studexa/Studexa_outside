import { beforeEach, describe, expect, it } from 'vitest'
import { useApp } from './store'

beforeEach(() => {
  localStorage.clear()
  useApp.getState().resetAll()
})

describe('fresh account baseline', () => {
  it('starts with no progress', () => {
    const s = useApp.getState()
    expect(s.level).toBe(1)
    expect(s.xp).toBe(0)
    expect(s.coins).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.bestStreak).toBe(0)
    expect(s.cardsToday).toBe(0)
    expect(s.owned).toEqual([])
    expect(s.equipped).toBeNull()
    expect(s.weakCards).toEqual([])
  })

  it('keeps sample content but clears its progress', () => {
    const s = useApp.getState()
    expect(s.decks.length).toBeGreaterThan(0)
    expect(s.notes.length).toBeGreaterThan(0)
    expect(Object.values(s.badges).every((earned) => earned === false)).toBe(true)
    expect(s.quests.every((q) => q.progress === 0 && !q.completed)).toBe(true)
  })

  it('restores the baseline after progress is earned', () => {
    useApp.getState().addXp(5000)
    expect(useApp.getState().level).toBeGreaterThan(1)

    useApp.getState().resetAll()

    expect(useApp.getState().level).toBe(1)
    expect(useApp.getState().xp).toBe(0)
    expect(useApp.getState().coins).toBe(0)
  })
})
