import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mascot } from '../../components/Mascot'
import { Icon } from '../../components/Icon'
import { celebrate } from '../../lib/confetti'

type DemoBeat = 'idle' | 'hover_card' | 'flipped' | 'hover_rating' | 'rated'

export function StudexaHeroDemoPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mode, setMode] = useState<'autoplay' | 'interactive'>('autoplay')
  const [beat, setBeat] = useState<DemoBeat>('idle')
  const [isFlipped, setIsFlipped] = useState(false)
  const [ratedChoice, setRatedChoice] = useState<string | null>(null)
  const [streakCount, setStreakCount] = useState(7)
  const [showReward, setShowReward] = useState(false)
  const [cardsReviewed, setCardsReviewed] = useState(14)
  const [cursorPos, setCursorPos] = useState({ x: 380, y: 340, click: false, visible: true })

  const cardRef = useRef<HTMLDivElement>(null)
  const goodBtnRef = useRef<HTMLButtonElement>(null)

  // Autoplay choreography loop
  useEffect(() => {
    if (mode !== 'autoplay') return

    let cancelled = false

    const runScript = async () => {
      // Reset state
      setIsFlipped(false)
      setRatedChoice(null)
      setShowReward(false)
      setStreakCount(7)
      setCardsReviewed(14)
      setBeat('idle')
      setCursorPos({ x: 180, y: 380, click: false, visible: true })

      await sleep(1000)
      if (cancelled) return

      // Beat 1: Move cursor to card center
      setBeat('hover_card')
      setCursorPos({ x: 360, y: 220, click: false, visible: true })
      await sleep(900)
      if (cancelled) return

      // Click card to flip
      setCursorPos({ x: 360, y: 220, click: true, visible: true })
      await sleep(150)
      if (cancelled) return
      setIsFlipped(true)
      setCursorPos({ x: 360, y: 220, click: false, visible: true })
      setBeat('flipped')
      await sleep(1100)
      if (cancelled) return

      // Beat 2: Move cursor down to "Good" rating button
      setBeat('hover_rating')
      setCursorPos({ x: 420, y: 355, click: false, visible: true })
      await sleep(900)
      if (cancelled) return

      // Click "Good" rating
      setCursorPos({ x: 420, y: 355, click: true, visible: true })
      await sleep(150)
      if (cancelled) return
      setRatedChoice('Good')
      setShowReward(true)
      setStreakCount(8)
      setCardsReviewed(15)
      setBeat('rated')
      celebrate()
      setCursorPos({ x: 420, y: 355, click: false, visible: true })

      // Beat 3: Hold payoff frame
      await sleep(2800)
      if (cancelled) return

      // Fade cursor and reset loop
      setCursorPos((prev) => ({ ...prev, visible: false }))
      await sleep(600)
      if (cancelled) return

      runScript()
    }

    runScript()

    return () => {
      cancelled = true
    }
  }, [mode])

  const handleManualFlip = () => {
    if (mode === 'autoplay') setMode('interactive')
    setIsFlipped(!isFlipped)
  }

  const handleManualRate = (rating: string) => {
    if (mode === 'autoplay') setMode('interactive')
    setRatedChoice(rating)
    setShowReward(true)
    setStreakCount(8)
    setCardsReviewed(15)
    celebrate()
  }

  const handleReset = () => {
    setIsFlipped(false)
    setRatedChoice(null)
    setShowReward(false)
    setStreakCount(7)
    setCardsReviewed(14)
    setBeat('idle')
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans p-4 md:p-8 flex flex-col items-center justify-center ${
        theme === 'dark' ? 'bg-[#181322] text-slate-100' : 'bg-[#f8f7fc] text-slate-900'
      }`}
    >
      {/* Top Controls Toolbar */}
      <header className="w-full max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors bg-white/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm hover:opacity-80"
          >
            <Icon name="arrowLeft" size={14} />
            Back to App
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Stageshow Live Mockup
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode switch */}
          <div className="flex items-center rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 border border-slate-300/60 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setMode('autoplay')}
              className={`px-3 py-1 rounded-lg transition-all ${
                mode === 'autoplay'
                  ? 'bg-violet-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Autoplay Demo
            </button>
            <button
              onClick={() => {
                setMode('interactive')
                setCursorPos((p) => ({ ...p, visible: false }))
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                mode === 'interactive'
                  ? 'bg-violet-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Try Yourself
            </button>
          </div>

          {/* Theme switch */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:opacity-80"
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={14} />
            {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
          </button>
        </div>
      </header>

      {/* Main Stageshow Canvas Area */}
      <div className="relative w-full max-w-4xl flex items-center justify-center">
        {/* Stageshow App Window Frame */}
        <div
          className={`relative w-full max-w-[760px] rounded-[24px] overflow-hidden border shadow-2xl transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-[#241d30] border-[#4d405e] shadow-black/60'
              : 'bg-[#fffefd] border-[#c9b6ed] shadow-violet-950/10'
          }`}
        >
          {/* Window Chrome Titlebar */}
          <div
            className={`px-4 py-3 flex items-center justify-between border-b ${
              theme === 'dark' ? 'bg-[#382951] border-[#4d405e]' : 'bg-[#eee7ff] border-[#ded6ed]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Icon name="book" size={13} className="text-blue-500" />
                Biology 101 › Cellular Respiration
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Daily Progress */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>{cardsReviewed}/25</span>
                <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-violet-700 rounded-full"
                    animate={{ width: `${(cardsReviewed / 25) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Streak Badge */}
              <motion.div
                animate={{ scale: showReward ? [1, 1.15, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-black border border-amber-500/20"
              >
                <Icon name="flame" size={14} />
                <span>{streakCount} Days</span>
              </motion.div>
            </div>
          </div>

          {/* Window Stage Inner Body */}
          <div className="p-6 md:p-8 min-h-[420px] flex flex-col justify-between relative overflow-hidden select-none">
            {/* Ambient Background Gradient Glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />

            {/* Top Deck Pill & Quiet Inks */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-extrabold">
                <Icon name="cards" size={13} />
                Card 14 • Spaced Repetition (SM-2)
              </span>

              {/* Quiet UI Bars */}
              <div className="flex items-center gap-1.5 opacity-40">
                <div className="w-12 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                <div className="w-6 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
              </div>
            </div>

            {/* The 3D Flip Flashcard */}
            <div
              ref={cardRef}
              onClick={handleManualFlip}
              className="my-5 cursor-pointer perspective-[1000px] w-full max-w-lg mx-auto"
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="relative min-h-[190px] rounded-[22px] p-6 text-center flex flex-col justify-between border shadow-lg transition-colors"
                style={{
                  transformStyle: 'preserve-3d',
                  backgroundColor: theme === 'dark' ? '#17223b' : '#ffffff',
                  borderColor: theme === 'dark' ? '#263450' : '#e2e8f0',
                }}
              >
                {/* Front Side */}
                <div
                  className="absolute inset-0 p-6 flex flex-col justify-between"
                  style={{
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Question
                  </p>
                  <h3 className="text-xl md:text-2xl font-black leading-snug px-2">
                    What is the primary function of ATP synthase in cellular respiration?
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-500/80">
                    <Icon name="sparkles" size={13} />
                    <span>Click or tap to flip card</span>
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className="absolute inset-0 p-6 flex flex-col justify-between rotate-y-180"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="flex items-center gap-1">
                      <Icon name="check" size={13} /> Answer
                    </span>
                    <span className="text-slate-400">Grounded Citation</span>
                  </div>
                  <p className="text-lg md:text-xl font-extrabold leading-snug text-slate-800 dark:text-slate-100">
                    Synthesizes <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-300">ATP</span> from ADP and inorganic phosphate via the electrochemical proton gradient.
                  </p>
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                      Campbell Biology • p. 194
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom Actions: 4 SM-2 Interval Rating Buttons */}
            <div className="space-y-2">
              <AnimatePresence>
                {isFlipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-4 gap-2 w-full max-w-lg mx-auto"
                  >
                    {/* Again */}
                    <button
                      onClick={() => handleManualRate('Again')}
                      className={`p-2.5 rounded-[14px] text-xs font-bold border transition-all text-center ${
                        ratedChoice === 'Again'
                          ? 'bg-rose-500 text-white border-rose-500 scale-95 shadow-md'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20'
                      }`}
                    >
                      <div className="font-black text-sm">Again</div>
                      <div className="text-[10px] opacity-80">&lt; 1 min</div>
                    </button>

                    {/* Hard */}
                    <button
                      onClick={() => handleManualRate('Hard')}
                      className={`p-2.5 rounded-[14px] text-xs font-bold border transition-all text-center ${
                        ratedChoice === 'Hard'
                          ? 'bg-amber-500 text-white border-amber-500 scale-95 shadow-md'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20'
                      }`}
                    >
                      <div className="font-black text-sm">Hard</div>
                      <div className="text-[10px] opacity-80">1 day</div>
                    </button>

                    {/* Good (Target of the demo) */}
                    <button
                      ref={goodBtnRef}
                      onClick={() => handleManualRate('Good')}
                      className={`p-2.5 rounded-[14px] text-xs font-bold border transition-all text-center relative ${
                        ratedChoice === 'Good'
                          ? 'bg-emerald-500 text-white border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg scale-95'
                          : beat === 'hover_rating'
                          ? 'bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-400'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                      }`}
                    >
                      <div className="font-black text-sm">Good</div>
                      <div className="text-[10px] opacity-80">4 days</div>
                    </button>

                    {/* Easy */}
                    <button
                      onClick={() => handleManualRate('Easy')}
                      className={`p-2.5 rounded-[14px] text-xs font-bold border transition-all text-center ${
                        ratedChoice === 'Easy'
                          ? 'bg-blue-500 text-white border-blue-500 scale-95 shadow-md'
                          : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20'
                      }`}
                    >
                      <div className="font-black text-sm">Easy</div>
                      <div className="text-[10px] opacity-80">7 days</div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isFlipped && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
              )}
            </div>

            {/* Stageshow Animated Cursor (Active during Autoplay) */}
            <AnimatePresence>
              {mode === 'autoplay' && cursorPos.visible && (
                <motion.div
                  animate={{
                    x: cursorPos.x,
                    y: cursorPos.y,
                    scale: cursorPos.click ? 0.85 : 1,
                  }}
                  transition={{
                    x: { type: 'spring', damping: 28, stiffness: 220 },
                    y: { type: 'spring', damping: 28, stiffness: 220 },
                    scale: { duration: 0.1 },
                  }}
                  className="pointer-events-none absolute z-30 top-0 left-0"
                >
                  {/* macOS / Stageshow Style Cursor SVG */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5.5 3.5L18.5 11.5L11.5 13.5L8.5 19.5L5.5 3.5Z"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {cursorPos.click && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute -top-1 -left-1 w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-500/30"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stageshow Satellite Card: Mascot Companion Reward */}
        <motion.div
          animate={{
            y: showReward ? [0, -6, 0] : 0,
            scale: showReward ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.4 }}
          className={`absolute -top-6 -right-4 sm:-right-8 z-20 w-44 rounded-2xl p-3 border shadow-xl backdrop-blur-md transition-colors ${
            theme === 'dark'
              ? 'bg-[#1e293b]/95 border-slate-700 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Mascot
                species="owl"
                mood={showReward ? 'sparkle' : 'happy'}
                size={54}
              />
              {showReward && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 text-xs"
                >
                  ✨
                </motion.span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Study Buddy
              </p>
              <div className="flex items-center gap-1 font-black text-sm">
                <span className="text-amber-500">+20 XP</span>
                <span className="text-xs text-slate-400">• +5 🪙</span>
              </div>
              <p className="text-[10px] font-semibold text-emerald-500">
                {showReward ? 'Memory strengthened!' : 'Active recalling'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer Notes & Reset */}
      <footer className="mt-8 text-center text-xs text-slate-400 max-w-md">
        <p>
          Stageshow demo crafted for <strong>Studexa</strong> • Demonstrates spaced repetition flashcards, SM-2 retention ratings, and mascot gamification.
        </p>
        {mode === 'interactive' && (
          <button
            onClick={handleReset}
            className="mt-3 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Reset Card
          </button>
        )}
      </footer>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

