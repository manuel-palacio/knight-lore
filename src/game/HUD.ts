import type { GameState } from './GameState'
import { CURE_SEQUENCE } from './GameState'

// Original-Knight-Lore-style scroll HUD (see 1.png, 5.png): hero icon +
// lives + carry slot on the left, delivered-items row + DAY counter + sun/
// moon in the centre, big pulsing "CAULDRON WANTS" slot on the right.
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

function itemClass(id: string | null, base = 'item-slot'): string {
  return id ? `${base} item-${id}` : base
}

export class HUD {
  private livesEl: HTMLElement
  private formGlyph: HTMLElement
  private dayEl: HTMLElement
  private carryEl: HTMLElement
  private wantsEl: HTMLElement
  private deliveredEl: HTMLElement
  private winEl: HTMLElement
  private gameOverEl: HTMLElement
  private gameOverReasonEl: HTMLElement

  constructor() {
    const ids = ['hud-lives', 'hud-form-glyph', 'hud-day', 'hud-carry', 'hud-wants', 'hud-delivered', 'win', 'gameover', 'gameover-reason']
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
    this.deliveredEl = els['hud-delivered']!
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
    this.carryEl.className = itemClass(carrying, 'item-slot carry-slot')

    this.wantsEl.textContent = glyphFor(state.wantedItem)
    this.wantsEl.className = itemClass(state.wantedItem, 'item-slot wants-slot')

    // Render the delivered items as a row of small icons
    while (this.deliveredEl.firstChild) this.deliveredEl.removeChild(this.deliveredEl.firstChild)
    for (let i = 0; i < CURE_SEQUENCE.length; i++) {
      const slot = document.createElement('span')
      const delivered = i < state.cureProgress
      const id = CURE_SEQUENCE[i]!
      slot.textContent = delivered ? glyphFor(id) : '·'
      slot.className = delivered ? itemClass(id) : 'item-slot'
      this.deliveredEl.appendChild(slot)
    }

    this.winEl.style.display = state.won ? 'flex' : 'none'
    this.gameOverEl.style.display = state.gameOver ? 'flex' : 'none'
    this.gameOverReasonEl.textContent =
      state.gameOverReason === 'days' ? 'THE 40 DAYS HAVE PASSED' : 'OUT OF LIVES'
  }
}
