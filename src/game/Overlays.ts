import type { GameState } from './GameState'

// The HTML overlays that sit on top of the canvas: win and game over.
export class Overlays {
  private readonly winEl: HTMLElement
  private readonly winDetailEl: HTMLElement
  private readonly gameOverEl: HTMLElement
  private readonly gameOverReasonEl: HTMLElement

  constructor() {
    const get = (id: string): HTMLElement => {
      const el = document.getElementById(id)
      if (!el) throw new Error(`overlay element #${id} missing from index.html`)
      return el
    }
    this.winEl = get('win')
    this.winDetailEl = get('win-detail')
    this.gameOverEl = get('gameover')
    this.gameOverReasonEl = get('gameover-reason')
  }

  render(state: GameState): void {
    this.winEl.style.display = state.won ? 'flex' : 'none'
    this.winDetailEl.textContent = `SABREMAN IS HUMAN AGAIN — DAY ${state.dayCount} OF 40`
    this.gameOverEl.style.display = state.gameOver ? 'flex' : 'none'
    const reason = state.gameOverReason === 'days' ? 'THE 40 DAYS HAVE PASSED' : 'OUT OF LIVES'
    this.gameOverReasonEl.textContent = `${reason} — DAY ${state.dayCount}, ${state.cureProgress} OF ${state.cureSequence.length} CHARMS`
  }
}
