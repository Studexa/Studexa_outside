export function trackDialogViewport(dialog: HTMLDialogElement) {
  const viewport = window.visualViewport
  const update = () => {
    dialog.style.setProperty('--dialog-viewport-height', `${viewport?.height ?? window.innerHeight}px`)
    dialog.style.setProperty('--dialog-viewport-top', `${viewport?.offsetTop ?? 0}px`)
  }

  update()
  window.addEventListener('resize', update)
  viewport?.addEventListener('resize', update)
  viewport?.addEventListener('scroll', update)
  return () => {
    window.removeEventListener('resize', update)
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
  }
}
