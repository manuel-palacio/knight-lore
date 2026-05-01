import type { GameState } from './GameState'

// DOM HUD using safe textContent updates (no innerHTML).
export class HUD {
  private formEl: HTMLElement
  private timerEl: HTMLElement
  private carryEl: HTMLElement
  private winEl: HTMLElement

  constructor() {
    const form = document.getElementById('hud-form')
    const timer = document.getElementById('hud-timer')
    const carry = document.getElementById('hud-carry')
    const win = document.getElementById('win')
    if (!form || !timer || !carry || !win) {
      throw new Error('HUD elements missing from index.html')
    }
    this.formEl = form
    this.timerEl = timer
    this.carryEl = carry
    this.winEl = win
  }

  render(state: GameState, carrying: string | null): void {
    const t = Math.max(0, state.transformTimer).toFixed(1)
    const formColor = state.form === 'human' ? '#ffefc4' : '#ff8060'

    this.formEl.textContent = `FORM: ${state.form.toUpperCase()}`
    this.formEl.style.color = formColor
    this.timerEl.textContent = `NEXT: ${t}s`
    this.carryEl.textContent = `CARRY: ${carrying ?? '—'}`

    this.winEl.style.display = state.won ? 'flex' : 'none'
  }
}
