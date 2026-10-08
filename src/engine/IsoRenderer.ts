import { projectToScreen, isoDepth, filmationConfig, roomScreenOffset, type IsoConfig } from './IsoProjection'
import type { Grid } from './Grid'
import { snapToInks } from './InkAndPaper'
import { drawOrder, type Box } from './DrawOrder'
import { backdropScreenPlace, backdropWorldPlace, type BackdropPart } from './Backdrop'
import { columnSegments, type DecorKind } from './ColumnLooks'

// 2D Filmation renderer. Draws a room as the original does: its wall sprites,
// its blocks and everything in it, sorted back to front (DrawOrder), in the
// room's one ink on black.

const TILE = 2
// The original's block sprite, which the rooms' columns are built of.
export const BLOCK_GRAPHIC = 7
// Where the original draws a block from its place (its handler, 0xC4E3).
const BLOCK_DRAWN_LOWER = 8

export interface Renderable {
  // World footprint origin (min corner) in grid cells and the column height.
  gx: number
  gz: number
  height: number
  // Sort key uses the cell's NEAR corner (max x/z) so taller/closer things paint last.
  draw: (ctx: CanvasRenderingContext2D, cfg: IsoConfig) => void
  depth: number
  // The room space it fills, for drawing it in turn (see DrawOrder).
  box: Box
}

// How much room space a sprite fills when nothing says: about his size.
const ACTOR_SIZE = { x: 0.8, y: 2, z: 0.8 }
// How high the original's walls stand: 44 pixels, 12 a block.
const WALL_HEIGHT = 44 / 12

// The room's ink, for what is drawn in it that is not already its colour.
export interface Shades {
  top: string
}

// CSS pixels kept clear either side of the play area for the touch controls.
const TOUCH_SIDE_ROOM = 120

export class IsoRenderer {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private cfg: IsoConfig

  constructor(container: HTMLElement, width: number, height: number, pixelScale = 2) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.fitToWindow(pixelScale)
    this.refit = () => this.fitToWindow(pixelScale)
    window.addEventListener('resize', this.refit)
    this.canvas.style.imageRendering = 'pixelated'
    container.appendChild(this.canvas)
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    this.ctx = ctx
    this.ctx.imageSmoothingEnabled = false

    this.cfg = filmationConfig(width, height)
  }

  // Fits the canvas again (the touch controls came or went).
  readonly refit: () => void

  // Scale the 256x192 screen to the window: whole multiples up to the given
  // scale when they fit, otherwise the largest size that keeps 4:3 inside.
  // With the touch controls showing, as large as fits between them.
  private fitToWindow(maxScale: number): void {
    const touch = document.body.classList.contains('touch')
    const availW = window.innerWidth - (touch ? 2 * TOUCH_SIDE_ROOM : 0)
    const availH = window.innerHeight
    const w = this.canvas.width
    const h = this.canvas.height
    const fit = Math.min(availW / w, availH / h)
    const whole = Math.floor(fit)
    const scale = whole >= 1 && !touch ? Math.min(whole, maxScale) : fit
    this.canvas.style.width = `${Math.floor(w * scale)}px`
    this.canvas.style.height = `${Math.floor(h * scale)}px`
  }

  get config(): IsoConfig {
    return this.cfg
  }

  clear(): void {
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  // Levels drawn as a hedge or a gargoyle are left out of the block columns;
  // their sprites come in with the dynamics.
  // The original's wall, arch, gate and hedge sprites, by graphic number (see Backdrop).
  private backdropSprites = new Map<number, HTMLImageElement>()
  // Draws a sprite in an ink: the room's pieces carry its colour whatever else
  // is drawn in other inks (see snapToInks).
  private inInk: (sprite: HTMLImageElement, ink: number) => CanvasImageSource & { width: number; height: number } = (sprite) => sprite

  setBackdropSprites(sprites: Map<number, HTMLImageElement>, inInk?: (sprite: HTMLImageElement, ink: number) => CanvasImageSource & { width: number; height: number }): void {
    this.backdropSprites = sprites
    this.blockSprite = sprites.get(BLOCK_GRAPHIC)
    if (inInk) this.inInk = inInk
  }

  // The original's block (graphic 7), a level of a column each.
  private blockSprite: HTMLImageElement | undefined

  // `inks`: what the picture may be drawn in (see Palette), the room's one ink unless told.
  render(room: { grid: Grid; tint: number; backdrop?: BackdropPart[]; decorAt?: (gx: number, gz: number, level: number) => DecorKind | undefined }, dynamics: Dynamic[], inks: number[] = [room.tint]): void {
    const ctx = this.ctx
    this.clear()

    const shades = toShades(room.tint)
    const items: Renderable[] = []

    // Walls, arches, gates and hedges: the original's sprites where it draws them.
    for (const part of room.backdrop ?? []) {
      const sprite = this.backdropSprites.get(part.graphic)
      if (sprite) items.push(backdropItem(part, this.inInk(sprite, room.tint), room.grid.width, room.grid.depth))
    }

    // The room's blocks, a block sprite a level, each column up to its height.
    for (let gz = 0; gz < room.grid.depth; gz++) {
      for (let gx = 0; gx < room.grid.width; gx++) {
        if (!room.grid.isSolid(gx, gz)) continue
        const h = room.grid.supportHeight(gx, gz) || 1
        for (const s of columnSegments(h, (level) => room.decorAt?.(gx, gz, level))) {
          if (s.look !== 'block' || !this.blockSprite) continue
          for (let level = s.bottom; level < s.top; level++) items.push(this.block(gx, gz, level, this.inInk(this.blockSprite, room.tint)))
        }
      }
    }

    // Dynamic visuals (character, items, enemies, set-pieces) at their world depth.
    for (const d of dynamics) {
      const size = d.size ?? ACTOR_SIZE
      items.push({
        gx: d.x / TILE,
        gz: d.z / TILE,
        height: 0,
        depth: d.depth ?? isoDepth(d.x, d.y, d.z),
        box: { x0: d.x - size.x / 2, x1: d.x + size.x / 2, z0: d.z - size.z / 2, z1: d.z + size.z / 2, y0: d.y, y1: d.y + size.y },
        draw: (c, cfg) => d.draw(c, cfg, shades),
      })
    }

    const shift = roomScreenOffset(room.grid.width, room.grid.depth, this.cfg)
    const cfg = { ...this.cfg, originX: this.cfg.originX + shift.dx, originY: this.cfg.originY + shift.dy }
    for (const it of drawOrder(items)) it.draw(ctx, cfg)
    this.snapToInks(inks)
  }

  // Ink on black, as the Spectrum draws it: no shades, no soft edges.
  private snapToInks(inks: number[]): void {
    const image = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    snapToInks(image.data, inks.map((ink) => ({ r: (ink >> 16) & 0xff, g: (ink >> 8) & 0xff, b: ink & 0xff })))
    this.ctx.putImageData(image, 0, 0)
  }

  // Sorted by the cell's centre, not its near corner, so a tall column at the
  // back never sorts over someone standing in front of it; drawn as the
  // original's block.
  private block(gx: number, gz: number, level: number, sprite: CanvasImageSource & { width: number; height: number }): Renderable {
    const cx = (gx + 0.5) * TILE
    const cz = (gz + 0.5) * TILE
    const draw = { image: sprite, frameX: 0, frameW: sprite.width, frameH: sprite.height, scale: 1, flip: false, x: cx, y: level, z: cz, drop: BLOCK_DRAWN_LOWER }
    return { gx, gz, height: level + 1, depth: isoDepth(cx, level, cz), box: cellBox(gx, gz, level, level + 1), draw: (ctx, cfg) => blitSprite(ctx, cfg, draw) }
  }


}

// A depth-sorted dynamic visual (character, item, enemy, set-piece). Its draw is
// called with the room's tint shades so procedural entities can match the palette.
export interface Dynamic {
  x: number
  y: number
  z: number
  // Optional explicit sort key — for a set-piece resting on a multi-cell platform
  // that would otherwise sort behind it. Defaults to isoDepth(x, y, z).
  depth?: number
  // The room space it fills, centred on x and z, up from y; about his size if not given.
  size?: { x: number; y: number; z: number }
  draw: (ctx: CanvasRenderingContext2D, cfg: IsoConfig, shades: Shades) => void
}

export interface SpriteDraw {
  image: CanvasImageSource
  frameX: number
  frameW: number
  frameH: number
  scale: number
  flip: boolean
  x: number
  y: number
  z: number
  // How far below its place the original draws its bottom row, in pixels
  // (the vertical offset its handler sets).
  drop?: number
}

// Build a Dynamic that blits a sprite frame anchored at its feet (world point).
function cellBox(gx: number, gz: number, bottom: number, top: number): Box {
  return { x0: gx * TILE, x1: (gx + 1) * TILE, z0: gz * TILE, z1: (gz + 1) * TILE, y0: bottom, y1: top }
}

// Drawn at its place on the whole screen, which a narrow room's shift leaves alone.
function backdropItem(part: BackdropPart, sprite: CanvasImageSource & { width: number; height: number }, width: number, depth: number): Renderable {
  const at = backdropWorldPlace(part, width, depth)
  const { left, top } = backdropScreenPlace(part, sprite.height)
  return {
    gx: at.x / TILE,
    gz: at.z / TILE,
    height: at.y,
    depth: isoDepth(at.x, at.y, at.z),
    box: wallBox(at, width * TILE, depth * TILE),
    draw: (ctx) => {
      if (!part.flip) return ctx.drawImage(sprite, left, top)
      ctx.save()
      ctx.translate(left + sprite.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(sprite, 0, top)
      ctx.restore()
    },
  }
}

// A wall piece stands along its wall, the whole length of it: a far wall's
// behind everything in the room, a near wall's in front. (Kept to its own
// place, a piece along the north wall a little east of him in the north-west
// corner was behind him one way and in front the other, and drawn over him.)
// A piece inside the room, if ever there is one, keeps to its own place.
export function wallBox(at: { x: number; y: number; z: number }, width: number, depth: number): Box {
  // A wall is behind (or in front of) the room at every height: a piece high
  // up the far wall is still behind him, not above him.
  const span = { y0: -WALL_REACH, y1: WALL_REACH }
  const across = { x0: -1, x1: width + 1 }
  const along = { z0: -1, z1: depth + 1 }
  if (at.z <= 0) return { ...across, z0: Math.min(at.z, -EDGE), z1: Math.min(at.z, -EDGE), ...span }
  if (at.x <= 0) return { ...along, x0: Math.min(at.x, -EDGE), x1: Math.min(at.x, -EDGE), ...span }
  if (at.z >= depth) return { ...across, z0: Math.max(at.z, depth + EDGE), z1: Math.max(at.z, depth + EDGE), ...span }
  if (at.x >= width) return { ...along, x0: Math.max(at.x, width + EDGE), x1: Math.max(at.x, width + EDGE), ...span }
  return { x0: at.x, x1: at.x, z0: at.z, z1: at.z, y0: at.y, y1: at.y + WALL_HEIGHT }
}

const EDGE = 0.01
const WALL_REACH = 100

// A stack of the original's blocks that moves or goes (a floating, falling,
// crumbling or moving block), a block a level from bottom to top.
export function blockColumnDynamic(block: CanvasImageSource & { width: number; height: number }, x: number, z: number, bottom: number, top: number): Dynamic {
  const levels: number[] = []
  for (let y = bottom; y < top - 1e-6; y++) levels.push(y)
  const at = (y: number): SpriteDraw => ({ image: block, frameX: 0, frameW: block.width, frameH: block.height, scale: 1, flip: false, x, y, z, drop: BLOCK_DRAWN_LOWER })
  return { x, y: bottom, z, size: { x: TILE, y: top - bottom, z: TILE }, draw: (ctx, cfg) => { for (const y of levels) blitSprite(ctx, cfg, at(y)) } }
}

export function spriteDynamic(s: SpriteDraw): Dynamic {
  return { x: s.x, y: s.y, z: s.z, draw: (ctx, cfg) => blitSprite(ctx, cfg, s) }
}

function blitSprite(ctx: CanvasRenderingContext2D, cfg: IsoConfig, s: SpriteDraw): void {
  const projected = projectToScreen(s.x, s.y, s.z, cfg)
  const feet = { sx: Math.round(projected.sx), sy: Math.round(projected.sy) + (s.drop ?? 0) }
  const w = s.frameW * s.scale
  const h = s.frameH * s.scale
  if (s.flip) {
    ctx.save()
    ctx.translate(feet.sx, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(s.image, s.frameX, 0, s.frameW, s.frameH, -w / 2, feet.sy - h, w, h)
    ctx.restore()
  } else {
    ctx.drawImage(s.image, s.frameX, 0, s.frameW, s.frameH, feet.sx - w / 2, feet.sy - h, w, h)
  }
}

function toShades(tint: number): Shades {
  return { top: `rgb(${(tint >> 16) & 0xff},${(tint >> 8) & 0xff},${tint & 0xff})` }
}
