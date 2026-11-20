import { lazy, Suspense, type ReactNode } from 'react'
import { AppShell } from './AppShell'
import { RequireAuth } from './RequireAuth'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PageSkeleton } from '../components/Skeleton'
import { HomePage } from '../features/home/HomePage'
import { LandingPage } from '../features/quiz/LandingPage'
import { CreateRoomPage } from '../features/quiz/CreateRoomPage'
import { JoinRoomPage } from '../features/quiz/JoinRoomPage'
import { LobbyPage } from '../features/quiz/LobbyPage'
import { PlayPage } from '../features/quiz/PlayPage'
import { ResultsPage } from '../features/quiz/ResultsPage'

export { AppShell, RequireAuth, ErrorBoundary, HomePage, LandingPage, CreateRoomPage, JoinRoomPage, LobbyPage, PlayPage, ResultsPage }

export const AuthPage = lazy(() => import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })))
export const AuthCallbackPage = lazy(() => import('../features/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })))
export const SubjectsPage = lazy(() => import('../features/subjects/SubjectsPage').then((m) => ({ default: m.SubjectsPage })))
export const OnboardingPage = lazy(() => import('../features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
export const StudyPage = lazy(() => import('../features/study/StudyPage').then((m) => ({ default: m.StudyPage })))
export const LibraryPage = lazy(() => import('../features/library/LibraryPage').then((m) => ({ default: m.LibraryPage })))
export const ReviewPage = lazy(() => import('../features/review/ReviewPage').then((m) => ({ default: m.ReviewPage })))
export const PracticePage = lazy(() => import('../features/review/PracticePage').then((m) => ({ default: m.PracticePage })))
export const BossPage = lazy(() => import('../features/boss/BossPage').then((m) => ({ default: m.BossPage })))
export const TimerPage = lazy(() => import('../features/timer/TimerPage').then((m) => ({ default: m.TimerPage })))
export const QuizPage = lazy(() => import('../features/quiz/QuizPage').then((m) => ({ default: m.QuizPage })))
export const MinigamesPage = lazy(() => import('../features/minigames/MinigamesPage').then((m) => ({ default: m.MinigamesPage })))
export const DecksPage = lazy(() => import('../features/decks/DecksPage').then((m) => ({ default: m.DecksPage })))
export const DeckEditorPage = lazy(() => import('../features/decks/DeckEditorPage').then((m) => ({ default: m.DeckEditorPage })))
export const NotesPage = lazy(() => import('../features/notes/NotesPage').then((m) => ({ default: m.NotesPage })))
export const NoteEditorPage = lazy(() => import('../features/notes/NoteEditorPage').then((m) => ({ default: m.NoteEditorPage })))
export const PlanPage = lazy(() => import('../features/planner/PlanPage').then((m) => ({ default: m.PlanPage })))
export const StatsPage = lazy(() => import('../features/stats/StatsPage').then((m) => ({ default: m.StatsPage })))
export const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
export const ExplorePage = lazy(() => import('../features/explore/ExplorePage').then((m) => ({ default: m.ExplorePage })))
export const ReaderPage = lazy(() => import('../features/explore/ReaderPage').then((m) => ({ default: m.ReaderPage })))
export const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
export const DesignPage = lazy(() => import('../features/design/DesignPage').then((m) => ({ default: m.DesignPage })))
export const StudexaHeroDemoPage = lazy(() => import('../features/demo/StudexaHeroDemoPage').then((m) => ({ default: m.StudexaHeroDemoPage })))

export function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}
