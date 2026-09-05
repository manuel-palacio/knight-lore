import type { GameState } from './GameState'
import { ALL_ITEMS } from './GameState'
import { iconUrl } from './HudIcons'

// Original-Knight-Lore-style scroll HUD (see 1.png, 5.png): hero icon +
// lives + carry slot on the left, delivered-items row + DAY counter + sun/
// moon in the centre, big pulsing "CAULDRON WANTS" slot on the right.
// Item slots use inline SVG pixel-art icons (see HudIcons.ts).
const ITEM_IDS: readonly string[] = ALL_ITEMS
const DIAL_TRAVEL_PX = 48

// Item slots show the real in-game item sprite, so the wanted item is
// recognisable on the floor of a room.
function setIconSlot(el: HTMLElement, id: string | null, baseClass = 'item-slot'): void {
  while (el.firstChild) el.removeChild(el.firstChild)
  if (id && ITEM_IDS.includes(id)) {
    const img = document.createElement('img')
    img.src = `/sprites/items/${id}.png`
    img.alt = id
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.imageRendering = 'pixelated'
    el.appendChild(img)
    el.className = `${baseClass} item-${id}`
  } else {
    el.textContent = '·'
    el.className = baseClass
  }
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
    const ids = ['hud-lives', 'hud-form-glyph', 'hud-day', 'hud-carry', 'hud-wants', 'hud-delivered', 'hud-hero', 'win', 'gameover', 'gameover-reason']
    const els: Record<string, HTMLElement> = {}
    for (const id of ids) {
      const el = document.getElementById(id)
      if (!el) throw new Error(`HUD element #${id} missing from index.html`)
      els[id] = el
    }
    // Paint the hero icon once.
    const hero = els['hud-hero']!
    const heroImg = document.createElement('img')
    heroImg.src = iconUrl('hero')
    heroImg.alt = 'hero'
    heroImg.style.width = '100%'
    heroImg.style.height = '100%'
    heroImg.style.imageRendering = 'pixelated'
    hero.appendChild(heroImg)
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

  flashCarrySlot(): void {
    this.carryEl.classList.add('slot-flash')
    setTimeout(() => this.carryEl.classList.remove('slot-flash'), 600)
  }

  render(state: GameState, carrying: string | null): void {
    this.livesEl.textContent = String(state.lives).padStart(2, '0')

    // Sun/moon as inline pixel-art image
    while (this.formGlyph.firstChild) this.formGlyph.removeChild(this.formGlyph.firstChild)
    const sm = document.createElement('img')
    sm.src = iconUrl(state.form === 'human' ? 'sun' : 'moon')
    sm.alt = state.form
    sm.style.width = '20px'
    sm.style.height = '20px'
    sm.style.imageRendering = 'pixelated'
    this.formGlyph.appendChild(sm)
    this.formGlyph.className = `day-glyph ${state.form === 'human' ? 'sun-glyph' : 'moon-glyph'}`
    // The sun or moon sweeps along its track as the spell runs out.
    this.formGlyph.style.transform = `translateX(${Math.round(state.dayProgress * DIAL_TRAVEL_PX)}px)`

    this.dayEl.textContent = ' ' + String(Math.min(state.dayCount, 40)).padStart(2, '0')

    setIconSlot(this.carryEl, carrying, 'item-slot carry-slot')
    setIconSlot(this.wantsEl, state.wantedItem, 'item-slot wants-slot')

    // Render the delivered items as a row of small icons
    while (this.deliveredEl.firstChild) this.deliveredEl.removeChild(this.deliveredEl.firstChild)
    for (let i = 0; i < state.cureSequence.length; i++) {
      const slot = document.createElement('span')
      const delivered = i < state.cureProgress
      const id = state.cureSequence[i]!
      setIconSlot(slot, delivered ? id : null)
      this.deliveredEl.appendChild(slot)
    }

    this.winEl.style.display = state.won ? 'flex' : 'none'
    this.gameOverEl.style.display = state.gameOver ? 'flex' : 'none'
    const reason = state.gameOverReason === 'days' ? 'THE 40 DAYS HAVE PASSED' : 'OUT OF LIVES'
    this.gameOverReasonEl.textContent = `${reason} — DAY ${state.dayCount}, ${state.cureProgress} OF ${state.cureSequence.length} CHARMS`
  }
}
