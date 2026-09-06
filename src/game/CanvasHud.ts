import type { GameState } from './GameState'
import { drawDigits } from './PixelFont'

// The original's HUD, drawn into the bottom 62 rows of the 256x192 screen:
// pillars and cords in the room hue, white hero and lives, green DAY, the
// red scroll holding the day dial and the charm the cauldron wants.
export const HUD_HEIGHT = 62
const HERO = { x: 20, y: 10 }
const LIVES = { x: 32, y: 18 }
const DAY = { x: 120, y: 50 }
const CARRY = { x: 56, y: 12 }
const SCROLL = { x: 190, y: 32, w: 52, h: 26 }
const DIAL_TRAVEL = 40

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
    if (carrying) this.drawItem(ctx, carrying, CARRY.x, top + CARRY.y)
    this.drawDial(ctx, top, state)
    if (state.wantedItem) this.drawItem(ctx, state.wantedItem, SCROLL.x + SCROLL.w / 2, top + SCROLL.y + 6)
  }

  // Sun by day, moon by night, sweeping across the top of the scroll.
  private drawDial(ctx: CanvasRenderingContext2D, top: number, state: GameState): void {
    const x = SCROLL.x + 6 + Math.round(state.dayProgress * DIAL_TRAVEL)
    const y = top + SCROLL.y - 4
    ctx.fillStyle = state.form === 'human' ? '#ffd95a' : '#cce4ff'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
    if (state.form === 'werewolf') {
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(x + 2, y - 1, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawItem(ctx: CanvasRenderingContext2D, id: string, centreX: number, y: number): void {
    const img = this.images.items.get(id)
    if (!img) return
    const scale = 0.5
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    ctx.drawImage(img, Math.round(centreX - w / 2), y, w, h)
  }
}
