import type { GameState } from './GameState'
import { drawDigits } from './PixelFont'

// The original's HUD, drawn into the bottom 62 rows of the 256x192 screen:
// pillars and cords in the room hue, white hero and lives, green DAY, the
// red scroll holding the day dial and the charm the cauldron wants.
// Positions measured from the original's screen (HUD occupies rows 128..191).
export const HUD_HEIGHT = 64
const HERO = { x: 20, y: 16 }
const LIVES = { x: 32, y: 24 }
const DAY = { x: 120, y: 57 }
// As in the original: the carried charm sits under the lives, the sun or
// moon fills the scroll and the wanted charm shows small in its corner.
const CARRY = { x: 28, y: 44 }
const SCROLL = { x: 186, y: 33, w: 44, h: 30 }
const DIAL_TRAVEL = 26
const WANTED = { x: 222, y: 48 }

export interface HudImages {
  scroll: HTMLCanvasElement
  day: HTMLCanvasElement
  hero: HTMLCanvasElement
  items: Map<string, HTMLImageElement>
}

export class CanvasHud {
  constructor(private readonly images: HudImages, private readonly tintFrame: (hue: number) => HTMLCanvasElement) {}

  draw(ctx: CanvasRenderingContext2D, top: number, state: GameState, carrying: string | null, roomTint: number): void {
    // The room's near corner runs under the HUD; the original blanks it.
    ctx.fillStyle = '#000'
    ctx.fillRect(0, top, ctx.canvas.width, HUD_HEIGHT)
    ctx.drawImage(this.tintFrame(roomTint), 0, top)
    ctx.drawImage(this.images.scroll, 0, top)
    ctx.drawImage(this.images.day, 0, top)
    ctx.drawImage(this.images.hero, HERO.x, top + HERO.y)
    drawDigits(ctx, String(state.lives).padStart(2, '0'), LIVES.x, top + LIVES.y, '#fff')
    drawDigits(ctx, String(Math.min(state.dayCount, 40)).padStart(2, '0'), DAY.x, top + DAY.y, '#fff')
    if (carrying) this.drawItem(ctx, carrying, CARRY.x, top + CARRY.y, 1)
    this.drawDial(ctx, top, state)
    if (state.wantedItem) this.drawItem(ctx, state.wantedItem, WANTED.x, top + WANTED.y, 0.5)
  }

  // Sun by day, moon by night, sweeping across the top of the scroll.
  private drawDial(ctx: CanvasRenderingContext2D, top: number, state: GameState): void {
    const x = SCROLL.x + 8 + Math.round(state.dayProgress * DIAL_TRAVEL)
    const y = top + SCROLL.y + 12
    ctx.fillStyle = state.form === 'human' ? '#ffd95a' : '#cce4ff'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    if (state.form === 'human') {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y + Math.sin(a) * 7), 1, 1)
      }
    } else {
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(x + 3, y - 2, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawItem(ctx: CanvasRenderingContext2D, id: string, centreX: number, y: number, scale: number): void {
    const img = this.images.items.get(id)
    if (!img) return
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    ctx.drawImage(img, Math.round(centreX - w / 2), y, w, h)
  }
}
