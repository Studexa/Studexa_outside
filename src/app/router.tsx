import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomePage } from '../features/home/HomePage'
import { StudyPage } from '../features/study/StudyPage'
import { NotesPage } from '../features/notes/NotesPage'
import { PlanPage } from '../features/planner/PlanPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { DesignPage } from '../features/design/DesignPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'study', element: <StudyPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'design', element: <DesignPage /> },
    ],
  },
])
