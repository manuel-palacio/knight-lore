import type { GameState } from './GameState'

// DOM HUD using safe textContent updates (no innerHTML).
export class HUD {
  private formEl: HTMLElement
  private timerEl: HTMLElement
  private carryEl: HTMLElement
  private winEl: HTMLElement
  private wantsEl: HTMLElement
  private cureEl: HTMLElement
  private dayEl: HTMLElement
  private livesEl: HTMLElement
  private gameOverEl: HTMLElement
  private gameOverReasonEl: HTMLElement

  constructor() {
    const form = document.getElementById('hud-form')
    const timer = document.getElementById('hud-timer')
    const carry = document.getElementById('hud-carry')
    const win = document.getElementById('win')
    const wants = document.getElementById('hud-wants')
    const cure = document.getElementById('hud-cure')
    const day = document.getElementById('hud-day')
    const lives = document.getElementById('hud-lives')
    const gameover = document.getElementById('gameover')
    const gameoverReason = document.getElementById('gameover-reason')
    if (!form || !timer || !carry || !win || !wants || !cure || !day || !lives || !gameover || !gameoverReason) {
      throw new Error('HUD elements missing from index.html')
    }
    this.formEl = form
    this.timerEl = timer
    this.carryEl = carry
    this.winEl = win
    this.wantsEl = wants
    this.cureEl = cure
    this.dayEl = day
    this.livesEl = lives
    this.gameOverEl = gameover
    this.gameOverReasonEl = gameoverReason
  }

  render(state: GameState, carrying: string | null): void {
    const t = Math.max(0, state.transformTimer).toFixed(1)
    const formColor = state.form === 'human' ? '#ffefc4' : '#ff8060'

    this.formEl.textContent = `FORM: ${state.form.toUpperCase()}`
    this.formEl.style.color = formColor
    this.timerEl.textContent = `NEXT: ${t}s`
    this.carryEl.textContent = `CARRY: ${carrying ?? '—'}`
    this.wantsEl.textContent = `WANTS: ${state.wantedItem ?? '—'}`
    this.cureEl.textContent = `CURE: ${state.cureProgress}/4`
    this.dayEl.textContent = `DAY: ${Math.min(state.dayCount, 40)}/40`
    this.livesEl.textContent = `LIVES: ${state.lives}`

    this.winEl.style.display = state.won ? 'flex' : 'none'
    this.gameOverEl.style.display = state.gameOver ? 'flex' : 'none'
    this.gameOverReasonEl.textContent =
      state.gameOverReason === 'days' ? 'THE 40 DAYS HAVE PASSED' : 'OUT OF LIVES'
  }
}
