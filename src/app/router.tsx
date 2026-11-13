import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { RequireAuth } from './RequireAuth'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { AuthPage } from '../features/auth/AuthPage'
import { SubjectsPage } from '../features/subjects/SubjectsPage'
import { OnboardingPage } from '../features/onboarding/OnboardingPage'
import { HomePage } from '../features/home/HomePage'
import { StudyPage } from '../features/study/StudyPage'
import { ReviewPage } from '../features/review/ReviewPage'
import { BossPage } from '../features/boss/BossPage'
import { TimerPage } from '../features/timer/TimerPage'
import { QuizPage } from '../features/quiz/QuizPage'
import { MinigamesPage } from '../features/minigames/MinigamesPage'
import { DecksPage } from '../features/decks/DecksPage'
import { DeckEditorPage } from '../features/decks/DeckEditorPage'
import { NotesPage } from '../features/notes/NotesPage'
import { NoteEditorPage } from '../features/notes/NoteEditorPage'
import { PlanPage } from '../features/planner/PlanPage'
import { StatsPage } from '../features/stats/StatsPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { ExplorePage } from '../features/explore/ExplorePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { DesignPage } from '../features/design/DesignPage'

export const router = createBrowserRouter([
  { path: '/login', element: (<ErrorBoundary><AuthPage mode="login" /></ErrorBoundary>) },
  { path: '/register', element: (<ErrorBoundary><AuthPage mode="register" /></ErrorBoundary>) },
  {
    path: '/onboarding',
    element: (
      <RequireAuth>
        <ErrorBoundary>
          <OnboardingPage />
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
      { index: true, element: <HomePage /> },
      { path: 'study', element: <StudyPage /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'study/review', element: <ReviewPage /> },
      { path: 'study/boss', element: <BossPage /> },
      { path: 'study/timer', element: <TimerPage /> },
      { path: 'study/quiz', element: <QuizPage /> },
      { path: 'study/minigames', element: <MinigamesPage /> },
      { path: 'study/decks', element: <DecksPage /> },
      { path: 'study/decks/:deckId', element: <DeckEditorPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'notes/:noteId', element: <NoteEditorPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'explore', element: <ExplorePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'design', element: <DesignPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
