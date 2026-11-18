import { createBrowserRouter, Navigate } from 'react-router-dom'
import { betaEnabled } from '../lib/beta'
import {
  AppShell, AuthCallbackPage, AuthPage, BossPage, CreateRoomPage, DeckEditorPage, DecksPage, DesignPage,
  ErrorBoundary, ExplorePage, HomePage, JoinRoomPage, LandingPage, LazyRoute, LobbyPage, MinigamesPage,
  NoteEditorPage, NotesPage, OnboardingPage, PlanPage, PlayPage, ProfilePage, QuizPage, RequireAuth,
  ResultsPage, ReviewPage, SettingsPage, StatsPage, StudexaHeroDemoPage, StudyPage, SubjectsPage, TimerPage,
} from './routeComponents'

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
          {betaEnabled ? <Navigate to="/login" replace /> : <AuthCallbackPage />}
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
    element: betaEnabled ? <Navigate to="/study/quiz" replace /> : <LandingPage />,
  },
  {
    path: '/quiz/create',
    element: betaEnabled ? <Navigate to="/study/quiz" replace /> : <RequireAuth><CreateRoomPage /></RequireAuth>,
  },
  {
    path: '/quiz/join',
    element: betaEnabled ? <Navigate to="/study/quiz" replace /> : <RequireAuth><JoinRoomPage /></RequireAuth>,
  },
  {
    path: '/quiz/lobby/:code',
    element: betaEnabled ? <Navigate to="/study/quiz" replace /> : <RequireAuth><LobbyPage /></RequireAuth>,
  },
  {
    path: '/quiz/play/:sessionId',
    element: betaEnabled ? <Navigate to="/study/quiz" replace /> : <RequireAuth><PlayPage /></RequireAuth>,
  },
  {
    path: '/quiz/results/:sessionId',
    element: betaEnabled ? <Navigate to="/study/quiz" replace /> : <RequireAuth><ResultsPage /></RequireAuth>,
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
            {betaEnabled ? <Navigate to="/" replace /> : <ExplorePage />}
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
