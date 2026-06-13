import type { GameState } from './GameState'

// Original-Knight-Lore-style scroll HUD (see 1.png): a horizontal parchment
// strip across the bottom with rolled-cylinder caps, lives as a "04"-style
// number next to a hero icon, DAY + sun/moon center, item slots + cure
// digit on the right.
const ITEM_GLYPH: Record<string, string> = {
  'goblet': '♕',
  'gem': '♦',
  'wine-bottle': '⚱',
  'crystal-ball': '◯',
}

function glyphFor(id: string | null): string {
  if (!id) return '—'
  return ITEM_GLYPH[id] ?? '?'
}

function itemClass(id: string | null): string {
  return id ? `hud-item item-${id}` : 'hud-item'
}

export class HUD {
  private livesEl: HTMLElement
  private formGlyph: HTMLElement
  private dayEl: HTMLElement
  private carryEl: HTMLElement
  private wantsEl: HTMLElement
  private cureEl: HTMLElement
  private winEl: HTMLElement
  private gameOverEl: HTMLElement
  private gameOverReasonEl: HTMLElement

  constructor() {
    const ids = ['hud-lives', 'hud-form-glyph', 'hud-day', 'hud-carry', 'hud-wants', 'hud-cure', 'win', 'gameover', 'gameover-reason']
    const els: Record<string, HTMLElement> = {}
    for (const id of ids) {
      const el = document.getElementById(id)
      if (!el) throw new Error(`HUD element #${id} missing from index.html`)
      els[id] = el
    }
    this.livesEl = els['hud-lives']!
    this.formGlyph = els['hud-form-glyph']!
    this.dayEl = els['hud-day']!
    this.carryEl = els['hud-carry']!
    this.wantsEl = els['hud-wants']!
    this.cureEl = els['hud-cure']!
    this.winEl = els['win']!
    this.gameOverEl = els['gameover']!
    this.gameOverReasonEl = els['gameover-reason']!
  }

  render(state: GameState, carrying: string | null): void {
    this.livesEl.textContent = String(state.lives).padStart(2, '0')

    this.formGlyph.textContent = state.form === 'human' ? '☀' : '☾'
    this.formGlyph.className = `day-glyph ${state.form === 'human' ? 'sun-glyph' : 'moon-glyph'}`

    this.dayEl.textContent = ' ' + String(Math.min(state.dayCount, 40)).padStart(2, '0')

    this.carryEl.textContent = glyphFor(carrying)
    this.carryEl.className = itemClass(carrying)

    this.wantsEl.textContent = glyphFor(state.wantedItem)
    this.wantsEl.className = itemClass(state.wantedItem)

    this.cureEl.textContent = String(state.cureProgress)

    this.winEl.style.display = state.won ? 'flex' : 'none'
    this.gameOverEl.style.display = state.gameOver ? 'flex' : 'none'
    this.gameOverReasonEl.textContent =
      state.gameOverReason === 'days' ? 'THE 40 DAYS HAVE PASSED' : 'OUT OF LIVES'
  }
}
