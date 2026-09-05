// Keyboard and gamepad input, read through keyboard codes so the game has
// one vocabulary. isDown(code) is true while held; wasPressed(code) is true
// exactly once per press. Call update() once per simulation tick.

export interface GamepadSnapshot {
  pressed: Set<number>
}

// Standard-mapping button indices onto the codes the game reads.
const GAMEPAD_BUTTONS: Record<number, string> = {
  12: 'ArrowUp',
  13: 'ArrowDown',
  14: 'ArrowLeft',
  15: 'ArrowRight',
  0: 'Space',
  1: 'KeyE',
  9: 'KeyP',
}

export type GamepadSource = () => GamepadSnapshot | null

export function browserGamepad(): GamepadSnapshot | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null
  const pad = Array.from(navigator.getGamepads()).find((p) => p !== null)
  if (!pad) return null
  const pressed = new Set<number>()
  pad.buttons.forEach((b, i) => { if (b.pressed) pressed.add(i) })
  return { pressed }
}

export class Input {
  private keysDown = new Set<string>()
  private padDown = new Set<string>()
  private pressedThisTick = new Set<string>()
  private pressedQueued = new Set<string>()

  constructor(private readonly gamepad: GamepadSource = browserGamepad) {
    if (typeof window === 'undefined') return
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  dispose(): void {
    if (typeof window === 'undefined') return
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keysDown.has(e.code)) this.pressedQueued.add(e.code)
    this.keysDown.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code)
  }

  update(): void {
    this.pollGamepad()
    this.pressedThisTick = this.pressedQueued
    this.pressedQueued = new Set()
  }

  private pollGamepad(): void {
    const snapshot = this.gamepad()
    const nowDown = new Set<string>()
    if (snapshot) {
      for (const [button, code] of Object.entries(GAMEPAD_BUTTONS)) {
        if (snapshot.pressed.has(Number(button))) nowDown.add(code)
      }
    }
    for (const code of nowDown) if (!this.padDown.has(code)) this.pressedQueued.add(code)
    this.padDown = nowDown
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code) || this.padDown.has(code)
  }

  wasPressed(code: string): boolean {
    return this.pressedThisTick.has(code)
  }
}
