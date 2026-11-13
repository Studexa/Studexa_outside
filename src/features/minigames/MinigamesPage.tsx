import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon, type IconName } from '../../components/Icon'
import { Mascot } from '../../components/Mascot'
import { ProgressBar } from '../../components/ProgressBar'
import { celebrate } from '../../lib/confetti'
import { playSound } from '../../lib/sound'
import { useApp } from '../../lib/store'
import { useAllStudyCards } from '../../lib/study'
import type { StudyCard } from '../../lib/api'
import { Spinner } from '../../components/Spinner'

type Tile = { key: string; cardId: string; text: string }
type Statement = { front: string; back: string; isTrue: boolean }
type Mode = 'hub' | 'memory' | 'quick'

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildTiles(cards: StudyCard[]): Tile[] {
  return shuffle(cards.slice(0, 3).flatMap((card) => [
    { key: `${card.id}-front`, cardId: card.id, text: card.front },
    { key: `${card.id}-back`, cardId: card.id, text: card.back },
  ]))
}

function buildStatements(cards: StudyCard[]): Statement[] {
  const chosen = shuffle(cards).slice(0, 8)
  return chosen.map((card, index) => {
    const decoy = cards[(index + 1) % cards.length]
    const isTrue = index % 2 === 0 || decoy.id === card.id
    return {
      front: card.front,
      back: isTrue ? card.back : decoy.back,
      isTrue: isTrue || decoy.back === card.back,
    }
  })
}

export function MinigamesPage() {
  const { t } = useTranslation()
  const { cards, isLoading } = useAllStudyCards()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">{t('minigames.title')}</h1>
        <p className="text-sm text-[var(--color-muted)]">{t('minigames.subtitle')}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner label={t('common.loading')} /></div>
      ) : (
        <Games cards={cards.map(({ card }) => card)} />
      )}
    </div>
  )
}

function Games({ cards }: { cards: StudyCard[] }) {
  const { t } = useTranslation()
  const buddy = useApp((s) => s.buddy)
  const addXp = useApp((s) => s.addXp)
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('hub')
  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(cards))
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [statements, setStatements] = useState<Statement[]>(() => buildStatements(cards))
  const [quickIndex, setQuickIndex] = useState(0)
  const [quickScore, setQuickScore] = useState(0)
  const [remaining, setRemaining] = useState(45)
  const [quickFinished, setQuickFinished] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const memoryRewarded = useRef(false)
  const quickRewarded = useRef(false)

  const pairs = Math.min(3, cards.length)
  const memoryWon = pairs > 0 && matched.length === pairs
  const quickDone = quickFinished || remaining === 0

  useEffect(() => {
    if (mode !== 'quick' || quickDone) return
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [mode, quickDone])

  useEffect(() => {
    if (memoryWon && !memoryRewarded.current) {
      memoryRewarded.current = true
      addXp(20)
      celebrate()
      playSound('success')
    }
  }, [memoryWon, addXp])

  useEffect(() => {
    if (quickDone && !quickRewarded.current) {
      quickRewarded.current = true
      addXp(10 + quickScore * 2)
      if (quickScore >= 5) celebrate()
      playSound('success')
    }
  }, [quickDone, quickScore, addXp])

  const resetMemory = () => {
    memoryRewarded.current = false
    setTiles(buildTiles(cards))
    setFlipped([])
    setMatched([])
    setMoves(0)
  }

  const resetQuick = () => {
    quickRewarded.current = false
    setStatements(buildStatements(cards))
    setQuickIndex(0)
    setQuickScore(0)
    setRemaining(45)
    setQuickFinished(false)
    setFeedback(null)
  }

  const startMode = (next: Mode) => {
    if (next === 'memory') resetMemory()
    if (next === 'quick') resetQuick()
    setMode(next)
    playSound('tap')
  }

  if (cards.length < 3) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-center">
        <Mascot species={buddy} mood="sleepy" size={120} />
        <p className="text-lg font-extrabold">{t('minigames.noCards')}</p>
        <p className="max-w-sm text-sm text-[var(--color-muted)]">{t('minigames.noCardsHint')}</p>
        <Button onClick={() => navigate('/study/decks')}>{t('minigames.addCards')}</Button>
      </div>
    )
  }

  if (mode === 'hub') {
    const games: { id: Mode; icon: IconName; tone: string; name: string; desc: string; badge: string }[] = [
      {
        id: 'memory',
        icon: 'layers',
        tone: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
        name: 'minigames.memory.name',
        desc: 'minigames.memory.desc',
        badge: 'minigames.memory.badge',
      },
      {
        id: 'quick',
        icon: 'bolt',
        tone: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
        name: 'minigames.quick.name',
        desc: 'minigames.quick.desc',
        badge: 'minigames.quick.badge',
      },
    ]
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <Mascot species={buddy} mood="happy" size={78} />
          <div>
            <p className="font-extrabold">{t('minigames.hubTitle')}</p>
            <p className="text-sm text-[var(--color-muted)]">{t('minigames.hubHint')}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => startMode(game.id)}
              className="pressable flex items-start gap-3 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${game.tone}`}>
                <Icon name={game.icon} size={23} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{t(game.name)}</span>
                <span className="mt-0.5 block text-xs font-semibold leading-snug text-[var(--color-muted)]">{t(game.desc)}</span>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-black text-[var(--color-accent)]">
                  <Icon name="bolt" size={11} /> {t(game.badge)}
                </span>
              </span>
              <Icon name="chevronRight" size={18} className="mt-1 shrink-0 text-[var(--color-muted)]" />
            </button>
          ))}
        </div>
        <Button variant="secondary" full onClick={() => navigate('/study')}>
          <Icon name="arrowLeft" size={17} /> {t('minigames.backToStudy')}
        </Button>
      </div>
    )
  }

  if (mode === 'memory') {
    const flip = (index: number) => {
      if (memoryWon || matched.includes(tiles[index].cardId) || flipped.includes(index) || flipped.length >= 2) return
      playSound('tap')
      const next = [...flipped, index]
      setFlipped(next)
      if (next.length < 2) return
      setMoves((value) => value + 1)
      const [first, second] = next
      if (tiles[first].cardId === tiles[second].cardId) {
        playSound('success')
        window.setTimeout(() => {
          setMatched((value) => [...value, tiles[second].cardId])
          setFlipped([])
        }, 450)
      } else {
        playSound('error')
        window.setTimeout(() => setFlipped([]), 900)
      }
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('hub')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
            aria-label={t('common.back')}
          >
            <Icon name="arrowLeft" size={19} />
          </button>
          <div className="flex-1">
            <p className="font-extrabold">{t('minigames.memory.name')}</p>
            <p className="text-xs font-semibold text-[var(--color-muted)]">
              {t('minigames.memory.progress', { matched: matched.length, pairs })}
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1 text-xs font-black text-[var(--color-muted)]">
            {t('minigames.memory.moves', { count: moves })}
          </span>
        </div>

        <div className="mx-auto grid w-full max-w-lg grid-cols-3 gap-2">
          {tiles.map((tile, index) => {
            const open = flipped.includes(index) || matched.includes(tile.cardId)
            return (
              <button
                key={tile.key}
                onClick={() => flip(index)}
                className={`flex aspect-square items-center justify-center rounded-[20px] border-2 p-2 text-center text-xs font-extrabold leading-tight transition sm:text-sm ${
                  matched.includes(tile.cardId)
                    ? 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]'
                    : open
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-primary)]'
                }`}
                aria-label={open ? tile.text : t('minigames.memory.hidden')}
              >
                {open ? <span className="line-clamp-3">{tile.text}</span> : <Icon name="star" size={26} />}
              </button>
            )
          })}
        </div>

        {memoryWon ? (
          <div className="animate-pop-in rounded-[24px] border border-[var(--color-success)]/40 bg-[var(--color-success-soft)] p-5 text-center">
            <p className="text-lg font-black text-[var(--color-success)]">{t('minigames.memory.wonTitle')}</p>
            <p className="text-sm text-[var(--color-muted)]">{t('minigames.memory.wonHint', { count: moves })}</p>
            <div className="mt-3 flex gap-2">
              <Button full onClick={resetMemory}>
                <Icon name="reset" size={17} /> {t('minigames.playAgain')}
              </Button>
              <Button full variant="secondary" onClick={() => setMode('hub')}>
                {t('minigames.backToGames')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm font-semibold text-[var(--color-muted)]">{t('minigames.memory.hint')}</p>
        )}
      </div>
    )
  }

  const statement = statements[quickIndex]
  const answer = (saysTrue: boolean) => {
    if (!statement || feedback) return
    const right = saysTrue === statement.isTrue
    if (right) setQuickScore((value) => value + 1)
    setFeedback(right ? 'correct' : 'wrong')
    playSound(right ? 'success' : 'error')
    window.setTimeout(() => {
      setFeedback(null)
      if (quickIndex + 1 >= statements.length) setQuickFinished(true)
      else setQuickIndex((value) => value + 1)
    }, 550)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('hub')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
          aria-label={t('common.back')}
        >
          <Icon name="arrowLeft" size={19} />
        </button>
        <div className="flex-1">
          <p className="font-extrabold">{t('minigames.quick.name')}</p>
          <ProgressBar value={Math.max(0, statements.length - quickIndex)} max={statements.length || 1} size="sm" />
        </div>
        <span className={`flex h-11 min-w-16 items-center justify-center gap-1 rounded-full px-3 text-sm font-black ${remaining <= 10 ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'}`}>
          <Icon name="clock" size={15} /> {remaining}s
        </span>
      </div>

      {quickDone ? (
        <div className="animate-pop-in rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-sm)]">
          <Mascot species={buddy} mood={quickScore >= 5 ? 'sparkle' : 'happy'} size={130} accessory={quickScore >= 5 ? 'hat' : null} />
          <p className="mt-2 text-lg font-black">{t('minigames.quick.doneTitle')}</p>
          <p className="text-sm text-[var(--color-muted)]">{t('minigames.quick.doneHint', { score: quickScore, total: statements.length })}</p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-sm font-black text-[var(--color-accent)]">
            <Icon name="bolt" size={14} /> +{10 + quickScore * 2} XP
          </p>
          <div className="mt-4 flex gap-2">
            <Button full onClick={resetQuick}>
              <Icon name="reset" size={17} /> {t('minigames.playAgain')}
            </Button>
            <Button full variant="secondary" onClick={() => setMode('hub')}>
              {t('minigames.backToGames')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {t('minigames.quick.statement')}
          </p>
          <p className="mt-3 text-center text-lg font-extrabold leading-snug">{statement?.front}</p>
          <p className="mt-2 text-center text-xl font-black text-[var(--color-primary)]">{statement?.back}</p>

          {feedback ? (
            <p
              className={`mt-4 flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold ${
                feedback === 'correct'
                  ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                  : 'bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]'
              }`}
            >
              <Icon name={feedback === 'correct' ? 'checkCircle' : 'xCircle'} size={17} />
              {feedback === 'correct' ? t('minigames.quick.correct') : t('minigames.quick.wrong')}
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="success" full size="lg" onClick={() => answer(true)}>
                <Icon name="check" size={20} /> {t('minigames.quick.true')}
              </Button>
              <Button variant="danger" full size="lg" onClick={() => answer(false)}>
                <Icon name="close" size={20} /> {t('minigames.quick.false')}
              </Button>
            </div>
          )}

          <p className="mt-3 text-center text-xs font-bold text-[var(--color-muted)]">
            {t('minigames.quick.score', { score: quickScore })}
          </p>
        </div>
      )}
    </div>
  )
}
