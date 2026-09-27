import type { GameState } from './GameState'
import { POTION_VERSE, summaryLines } from './EndSummary'

// The HTML overlays that sit on top of the canvas: win and game over. Both
// end on the original's summary (see EndSummary); a win first has the verse
// the original shows when the cure is brewed.
export class Overlays {
  private readonly winEl: HTMLElement
  private readonly winVerseEl: HTMLElement
  private readonly winSummaryEl: HTMLElement
  private readonly gameOverEl: HTMLElement
  private readonly gameOverSummaryEl: HTMLElement

  constructor() {
    const get = (id: string): HTMLElement => {
      const el = document.getElementById(id)
      if (!el) throw new Error(`overlay element #${id} missing from index.html`)
      return el
    }
    this.winEl = get('win')
    this.winVerseEl = get('win-verse')
    this.winSummaryEl = get('win-summary')
    this.gameOverEl = get('gameover')
    this.gameOverSummaryEl = get('gameover-summary')
  }

  render(state: GameState): void {
    this.winEl.style.display = state.won ? 'flex' : 'none'
    this.gameOverEl.style.display = state.gameOver ? 'flex' : 'none'
    if (!state.won && !state.gameOver) return
    const summary = summaryLines(state.summary)
    if (state.won) {
      setLines(this.winVerseEl, POTION_VERSE)
      setLines(this.winSummaryEl, summary)
    } else {
      setLines(this.gameOverSummaryEl, summary)
    }
  }
}

function setLines(el: HTMLElement, lines: readonly string[]): void {
  const text = lines.join('\n')
  if (el.textContent === text) return
  el.textContent = text
}
