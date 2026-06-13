import type { GameState } from './GameState'

const HEART_FULL = '♥' // ♥
const HEART_EMPTY = '♡' // ♡
const CURE_FULL = '●' // ●
const CURE_EMPTY = '○' // ○

const ITEM_GLYPH: Record<string, string> = {
  'goblet': '🏆', // fall-back to letter if emoji not supported
  'gem': '◆',
  'wine-bottle': '🍷',
  'crystal-ball': '◯',
}

function glyphFor(id: string | null): string {
  if (!id) return '—'
  return ITEM_GLYPH[id] ?? '?'
}

function itemClass(id: string | null): string {
  return id ? `hud-item-slot item-${id}` : 'hud-item-slot'
}

// Original-Knight-Lore-style scroll HUD: hearts left, day+sun/moon center,
// carry slot + cauldron-wants slot + cure dots right.
export class HUD {
  private livesEl: HTMLElement
  private formGlyph: HTMLElement
  private dayEl: HTMLElement
  private timerEl: HTMLElement
  private carryEl: HTMLElement
  private wantsEl: HTMLElement
  private cureEl: HTMLElement
  private winEl: HTMLElement
  private gameOverEl: HTMLElement
  private gameOverReasonEl: HTMLElement

  constructor() {
    const ids = ['hud-lives', 'hud-form-glyph', 'hud-day', 'hud-timer', 'hud-carry', 'hud-wants', 'hud-cure', 'win', 'gameover', 'gameover-reason']
    const els: Record<string, HTMLElement> = {}
    for (const id of ids) {
      const el = document.getElementById(id)
      if (!el) throw new Error(`HUD element #${id} missing from index.html`)
      els[id] = el
    }
    this.livesEl = els['hud-lives']!
    this.formGlyph = els['hud-form-glyph']!
    this.dayEl = els['hud-day']!
    this.timerEl = els['hud-timer']!
    this.carryEl = els['hud-carry']!
    this.wantsEl = els['hud-wants']!
    this.cureEl = els['hud-cure']!
    this.winEl = els['win']!
    this.gameOverEl = els['gameover']!
    this.gameOverReasonEl = els['gameover-reason']!
  }

  render(state: GameState, carrying: string | null): void {
    this.livesEl.textContent = HEART_FULL.repeat(state.lives) + HEART_EMPTY.repeat(Math.max(0, 5 - state.lives))

    this.formGlyph.textContent = state.form === 'human' ? '☀' : '☾'
    this.formGlyph.className = `day-glyph ${state.form === 'human' ? 'sun-glyph' : 'moon-glyph'}`

    this.dayEl.textContent = String(Math.min(state.dayCount, 40)).padStart(2, '0')
    this.timerEl.textContent = `${Math.max(0, state.transformTimer).toFixed(0)}s`

    this.carryEl.textContent = glyphFor(carrying)
    this.carryEl.className = itemClass(carrying)

    this.wantsEl.textContent = glyphFor(state.wantedItem)
    this.wantsEl.className = itemClass(state.wantedItem)

    const filled = state.cureProgress
    let dots = ''
    for (let i = 0; i < 4; i++) dots += i < filled ? CURE_FULL : CURE_EMPTY
    this.cureEl.textContent = dots

    this.winEl.style.display = state.won ? 'flex' : 'none'
    this.gameOverEl.style.display = state.gameOver ? 'flex' : 'none'
    this.gameOverReasonEl.textContent =
      state.gameOverReason === 'days' ? 'THE 40 DAYS HAVE PASSED' : 'OUT OF LIVES'
  }
}
