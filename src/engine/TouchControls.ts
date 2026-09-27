import type { TouchPad } from './TouchPad'

// Binds the on-screen controls (elements with a data-key inside `root`) to a
// TouchPad: a finger holds the button under it, following it as it slides,
// until it lifts or the touch is cancelled.
export function bindTouchControls(root: HTMLElement, pad: TouchPad): void {
  const down = new Map<number, string | undefined>()
  // Each held button lit, whichever finger holds it.
  const light = (): void => {
    const held = new Set(down.values())
    for (const button of root.querySelectorAll<HTMLElement>('[data-key]')) button.classList.toggle('held', held.has(button.dataset.key))
  }
  const hold = (e: PointerEvent, key: string | undefined): void => {
    down.set(e.pointerId, key)
    pad.touch(e.pointerId, key)
    light()
  }
  const keyUnder = (e: PointerEvent): string | undefined =>
    (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-key]')?.dataset.key
  root.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    hold(e, keyUnder(e) ?? (e.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key)
  })
  root.addEventListener('pointermove', (e) => {
    if (down.has(e.pointerId)) hold(e, keyUnder(e))
  })
  const lift = (e: PointerEvent): void => {
    down.delete(e.pointerId)
    pad.lift(e.pointerId)
    light()
  }
  root.addEventListener('pointerup', lift)
  root.addEventListener('pointercancel', lift)
  root.addEventListener('contextmenu', (e) => e.preventDefault())
}

// On a touch screen the controls show; a key hides them. `changed` is told
// either way, to fit the play area around them.
export function showTouchControlsWhenTouched(changed: () => void): void {
  const setTouch = (on: boolean): void => {
    if (document.body.classList.contains('touch') === on) return
    document.body.classList.toggle('touch', on)
    changed()
  }
  if (window.matchMedia('(pointer: coarse)').matches) setTouch(true)
  window.addEventListener('touchstart', () => setTouch(true), { passive: true })
  window.addEventListener('keydown', () => setTouch(false))
}
