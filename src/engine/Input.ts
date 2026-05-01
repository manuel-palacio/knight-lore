// Keyboard input. isDown(key) returns true while held. wasPressed(key)
// returns true exactly once per press (half-edge), useful for action keys.
// Call update() once per simulation tick to advance the wasPressed window.
export class Input {
  private down = new Set<string>()
  private pressedThisTick = new Set<string>()
  private pressedQueued = new Set<string>()

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.down.has(e.code)) {
      this.pressedQueued.add(e.code)
    }
    this.down.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code)
  }

  update(): void {
    this.pressedThisTick = this.pressedQueued
    this.pressedQueued = new Set()
  }

  isDown(code: string): boolean {
    return this.down.has(code)
  }

  wasPressed(code: string): boolean {
    return this.pressedThisTick.has(code)
  }
}
