import { useEffect, useState, type RefObject } from 'react'
import type { Reading, SelectionRange } from '../../lib/api/readings'

export type Passage = { text: string; rect: DOMRect; range?: SelectionRange }

function readingBoundary(root: HTMLElement, node: Node, offset: number, end: boolean) {
  const block = (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('[data-reading-block]')
  if (block && root.contains(block)) {
    const prefix = document.createRange()
    prefix.selectNodeContents(block)
    prefix.setEnd(node, offset)
    return { block: Number(block.dataset.readingBlock), offset: prefix.toString().length }
  }
  if (node !== root) return undefined
  const boundary = root.children[end ? offset - 1 : offset] as HTMLElement | undefined
  if (!boundary?.hasAttribute('data-reading-block')) return undefined
  return { block: Number(boundary.dataset.readingBlock), offset: end ? boundary.textContent?.length ?? 0 : 0 }
}

function selectedPassage(root: HTMLElement, reading?: Reading): Passage | undefined {
  const selection = window.getSelection()
  if (!selection?.rangeCount || selection.isCollapsed) return undefined
  const native = selection.getRangeAt(0)
  if (!root.contains(native.startContainer) || !root.contains(native.endContainer)) return undefined
  const rect = native.getBoundingClientRect()
  if (!reading) {
    const text = selection.toString().trim()
    return text ? { rect, text } : undefined
  }
  const start = readingBoundary(root, native.startContainer, native.startOffset, false)
  const end = readingBoundary(root, native.endContainer, native.endOffset, true)
  if (!start || !end) return undefined
  const text = reading.blocks.slice(start.block, end.block + 1).map(({ text: value }, index, blocks) =>
    value.slice(index === 0 ? start.offset : 0, index === blocks.length - 1 ? end.offset : value.length),
  ).join('\n\n').trim()
  return text ? { text, rect, range: { startBlock: start.block, startOffset: start.offset, endBlock: end.block, endOffset: end.offset } } : undefined
}

export function usePassageSelection(root: RefObject<HTMLElement | null>, reading?: Reading) {
  const [selection, setSelection] = useState<Passage>()
  useEffect(() => {
    const update = () => {
      const next = root.current ? selectedPassage(root.current, reading) : undefined
      if (!next && document.activeElement?.closest('[data-selection-actions]')) return
      setSelection(next)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        if (root.current && selectedPassage(root.current, reading)) window.getSelection()?.removeAllRanges()
        setSelection(undefined)
      }
      if (event.key === 'Tab' && !event.shiftKey && root.current?.contains(document.activeElement)
          && selectedPassage(root.current, reading)) {
        const firstAction = document.querySelector<HTMLButtonElement>('[data-selection-actions] button:not(:disabled)')
        if (firstAction) {
          event.preventDefault()
          firstAction.focus({ preventScroll: true })
        }
      }
    }
    document.addEventListener('selectionchange', update)
    document.addEventListener('pointerup', update)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', update, { capture: true, passive: true })
    window.addEventListener('resize', update)
    return () => {
      document.removeEventListener('selectionchange', update)
      document.removeEventListener('pointerup', update)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [root, reading])

  const clear = () => { window.getSelection()?.removeAllRanges(); setSelection(undefined) }
  return { selection, clear }
}
