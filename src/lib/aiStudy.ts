export const STUDY_SOURCE_EVENT = 'studexa:study-source'
export const STUDY_COMPANION_EVENT = 'studexa:open-companion'
export const MAX_TUTOR_SOURCE = 12000
export type StudySource = { title: string; text: string }

export function openStudyCompanion(opener: HTMLButtonElement) {
  window.dispatchEvent(new CustomEvent(STUDY_COMPANION_EVENT, { detail: opener }))
}

/** Opens a local draft only. Sending requires a separate student action. */
export function openStudyBuddy(source: StudySource) {
  window.dispatchEvent(new CustomEvent<StudySource>(STUDY_SOURCE_EVENT, { detail: source }))
}
