export const STUDY_SOURCE_EVENT = 'studexa:study-source'
export const STUDY_COMPANION_EVENT = 'studexa:open-companion'
export const MAX_TUTOR_SOURCE = 12000
export type StudySource = { title: string; text: string }

const immersiveRoutes = ['/study/review', '/study/practice', '/study/boss', '/study/timer']
const routesWithoutTutor = [...immersiveRoutes, '/study/quiz', '/study/minigames',
  '/auth', '/login', '/register', '/demo', '/onboarding', '/quiz']

function includesRoute(routes: string[], pathname: string) {
  return routes.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

export function isImmersiveStudyRoute(pathname: string) {
  return includesRoute(immersiveRoutes, pathname)
}

export function isTutorRoute(pathname: string) {
  return !includesRoute(routesWithoutTutor, pathname)
}

export function openStudyCompanion(opener: HTMLButtonElement) {
  window.dispatchEvent(new CustomEvent(STUDY_COMPANION_EVENT, { detail: opener }))
}

/** Opens a local draft only. Sending requires a separate student action. */
export function openStudyBuddy(source: StudySource, opener?: HTMLButtonElement) {
  window.dispatchEvent(new CustomEvent(STUDY_SOURCE_EVENT, { detail: { source, opener } }))
}
