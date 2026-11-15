import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
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

const AuthPage = lazy(() => import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })))
const AuthCallbackPage = lazy(() => import('../features/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })))
const SubjectsPage = lazy(() => import('../features/subjects/SubjectsPage').then((m) => ({ default: m.SubjectsPage })))
const OnboardingPage = lazy(() => import('../features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const StudyPage = lazy(() => import('../features/study/StudyPage').then((m) => ({ default: m.StudyPage })))
const ReviewPage = lazy(() => import('../features/review/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const BossPage = lazy(() => import('../features/boss/BossPage').then((m) => ({ default: m.BossPage })))
const TimerPage = lazy(() => import('../features/timer/TimerPage').then((m) => ({ default: m.TimerPage })))
const QuizPage = lazy(() => import('../features/quiz/QuizPage').then((m) => ({ default: m.QuizPage })))
const MinigamesPage = lazy(() => import('../features/minigames/MinigamesPage').then((m) => ({ default: m.MinigamesPage })))
const DecksPage = lazy(() => import('../features/decks/DecksPage').then((m) => ({ default: m.DecksPage })))
const DeckEditorPage = lazy(() => import('../features/decks/DeckEditorPage').then((m) => ({ default: m.DeckEditorPage })))
const NotesPage = lazy(() => import('../features/notes/NotesPage').then((m) => ({ default: m.NotesPage })))
const NoteEditorPage = lazy(() => import('../features/notes/NoteEditorPage').then((m) => ({ default: m.NoteEditorPage })))
const PlanPage = lazy(() => import('../features/planner/PlanPage').then((m) => ({ default: m.PlanPage })))
const StatsPage = lazy(() => import('../features/stats/StatsPage').then((m) => ({ default: m.StatsPage })))
const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const ExplorePage = lazy(() => import('../features/explore/ExplorePage').then((m) => ({ default: m.ExplorePage })))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const DesignPage = lazy(() => import('../features/design/DesignPage').then((m) => ({ default: m.DesignPage })))
const StudexaHeroDemoPage = lazy(() => import('../features/demo/StudexaHeroDemoPage').then((m) => ({ default: m.StudexaHeroDemoPage })))

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <ErrorBoundary>
        <LazyRoute>
          <AuthPage mode="login" />
        </LazyRoute>
      </ErrorBoundary>
    ),
  },
  {
    path: '/register',
    element: (
      <ErrorBoundary>
        <LazyRoute>
          <AuthPage mode="register" />
        </LazyRoute>
      </ErrorBoundary>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <ErrorBoundary>
        <LazyRoute>
          <AuthCallbackPage />
        </LazyRoute>
      </ErrorBoundary>
    ),
  },
  {
    path: '/demo',
    element: (
      <ErrorBoundary>
        <LazyRoute>
          <StudexaHeroDemoPage />
        </LazyRoute>
      </ErrorBoundary>
    ),
  },
  {
    path: '/quiz',
    element: <LandingPage />,
  },
  {
    path: '/quiz/create',
    element: <CreateRoomPage />,
  },
  {
    path: '/quiz/join',
    element: <JoinRoomPage />,
  },
  {
    path: '/quiz/lobby/:code',
    element: <LobbyPage />,
  },
  {
    path: '/quiz/play/:sessionId',
    element: <PlayPage />,
  },
  {
    path: '/quiz/results/:sessionId',
    element: <ResultsPage />,
  },
  {
    path: '/onboarding',
    element: (
      <RequireAuth>
        <ErrorBoundary>
          <LazyRoute>
            <OnboardingPage />
          </LazyRoute>
        </ErrorBoundary>
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'study',
        element: (
          <LazyRoute>
            <StudyPage />
          </LazyRoute>
        ),
      },
      {
        path: 'subjects',
        element: (
          <LazyRoute>
            <SubjectsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'study/review',
        element: (
          <LazyRoute>
            <ReviewPage />
          </LazyRoute>
        ),
      },
      {
        path: 'study/boss',
        element: (
          <LazyRoute>
            <BossPage />
          </LazyRoute>
        ),
      },
      {
        path: 'study/timer',
        element: (
          <LazyRoute>
            <TimerPage />
          </LazyRoute>
        ),
      },
      {
        path: 'study/quiz',
        element: (
          <LazyRoute>
            <QuizPage />
          </LazyRoute>
        ),
      },
      {
        path: 'study/minigames',
        element: (
          <LazyRoute>
            <MinigamesPage />
          </LazyRoute>
        ),
      },
      {
        path: 'study/decks',
        element: (
          <LazyRoute>
            <DecksPage />
          </LazyRoute>
        ),
      },
      {
        path: 'study/decks/:deckId',
        element: (
          <LazyRoute>
            <DeckEditorPage />
          </LazyRoute>
        ),
      },
      {
        path: 'notes',
        element: (
          <LazyRoute>
            <NotesPage />
          </LazyRoute>
        ),
      },
      {
        path: 'notes/:noteId',
        element: (
          <LazyRoute>
            <NoteEditorPage />
          </LazyRoute>
        ),
      },
      {
        path: 'plan',
        element: (
          <LazyRoute>
            <PlanPage />
          </LazyRoute>
        ),
      },
      {
        path: 'stats',
        element: (
          <LazyRoute>
            <StatsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <LazyRoute>
            <ProfilePage />
          </LazyRoute>
        ),
      },
      {
        path: 'explore',
        element: (
          <LazyRoute>
            <ExplorePage />
          </LazyRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <LazyRoute>
            <SettingsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'design',
        element: (
          <LazyRoute>
            <DesignPage />
          </LazyRoute>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
