import { projectToScreen, isoDepth, filmationConfig, roomScreenOffset, type IsoConfig } from './IsoProjection'
import type { Grid } from './Grid'
import { snapToInkAndPaper } from './InkAndPaper'
import { drawOrder, type Box } from './DrawOrder'
import { backdropScreenPlace, backdropWorldPlace, type BackdropPart } from './Backdrop'
import { columnSegments, type DecorKind } from './ColumnLooks'

// 2D Filmation renderer. Draws the simulation (grid solids + dynamic entities) as
// monochrome isometric cubes plus character/item sprites, depth-sorted back-to-front
// (painter's algorithm). One hue per room on a black void floor — the ZX look.

const TILE = 2
const BLOCK_GRAPHIC = 7
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

export interface Shades {
  top: string
  right: string
  left: string
  line: string
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

  setBackdropSprites(sprites: Map<number, HTMLImageElement>): void {
    this.backdropSprites = sprites
    this.blockSprite = sprites.get(BLOCK_GRAPHIC)
  }

  // The original's block (graphic 7), a level of a column each.
  private blockSprite: HTMLImageElement | undefined

  render(room: { grid: Grid; tint: number; backdrop?: BackdropPart[]; decorAt?: (gx: number, gz: number, level: number) => DecorKind | undefined }, dynamics: Dynamic[]): void {
    const ctx = this.ctx
    this.clear()

    const shades = toShades(room.tint)
    const items: Renderable[] = []

    // Walls, arches, gates and hedges: the original's sprites where it draws them.
    for (const part of room.backdrop ?? []) {
      const sprite = this.backdropSprites.get(part.graphic)
      if (sprite) items.push(backdropItem(part, sprite, room.grid.width, room.grid.depth))
    }

    // Solid floor cells (static blocks) as cubes sized by support height.
    for (let gz = 0; gz < room.grid.depth; gz++) {
      for (let gx = 0; gx < room.grid.width; gx++) {
        if (!room.grid.isSolid(gx, gz)) continue
        const h = room.grid.supportHeight(gx, gz) || 1
        for (const s of columnSegments(h, (level) => room.decorAt?.(gx, gz, level))) {
          if (s.look !== 'block') continue
          if (!this.blockSprite) items.push(this.cube(gx, gz, s.bottom, s.top, shades))
          else for (let level = s.bottom; level < s.top; level++) items.push(this.block(gx, gz, level, this.blockSprite))
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
    this.snapToRoomInk(room.tint)
  }

  // One ink on black, as the Spectrum draws it: no shades, no soft edges.
  private snapToRoomInk(tint: number): void {
    const image = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    snapToInkAndPaper(image.data, { r: (tint >> 16) & 0xff, g: (tint >> 8) & 0xff, b: tint & 0xff })
    this.ctx.putImageData(image, 0, 0)
  }

  // Sorted as a cube is (see cube), drawn as the original draws it.
  private block(gx: number, gz: number, level: number, sprite: HTMLImageElement): Renderable {
    const cx = (gx + 0.5) * TILE
    const cz = (gz + 0.5) * TILE
    const draw = { image: sprite, frameX: 0, frameW: sprite.width, frameH: sprite.height, scale: 1, flip: false, x: cx, y: level, z: cz, drop: BLOCK_DRAWN_LOWER }
    return { gx, gz, height: level + 1, depth: isoDepth(cx, level, cz), box: cellBox(gx, gz, level, level + 1), draw: (ctx, cfg) => blitSprite(ctx, cfg, draw) }
  }

  private cube(gx: number, gz: number, bottom: number, top: number, shades: Shades): Renderable {
    // Sort by the CELL CENTRE, not the near corner. A tall back-wall cube sorted
    // by its near corner over-sorts (its corner x exceeds an actor standing in
    // front of it on a lower z), drawing the wall OVER the actor — the player
    // appears to vanish into the wall. Cell-centre depth keeps walls behind any
    // in-bounds actor.
    const cx = (gx + 0.5) * TILE
    const cz = (gz + 0.5) * TILE
    return {
      gx,
      gz,
      height: top,
      depth: isoDepth(cx, bottom, cz),
      box: cellBox(gx, gz, bottom, top),
      draw: (ctx, cfg) => drawIsoCube(ctx, cfg, gx, gz, bottom, top, shades),
    }
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
function backdropItem(part: BackdropPart, sprite: HTMLImageElement, width: number, depth: number): Renderable {
  const at = backdropWorldPlace(part, width, depth)
  const { left, top } = backdropScreenPlace(part, sprite.height)
  return {
    gx: at.x / TILE,
    gz: at.z / TILE,
    height: at.y,
    depth: isoDepth(at.x, at.y, at.z),
    // A wall stands at its place, as thin as a line: behind the room, or in front of it.
    box: { x0: at.x, x1: at.x, z0: at.z, z1: at.z, y0: at.y, y1: at.y + WALL_HEIGHT },
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

export interface Box3 {
  x0: number
  x1: number
  z0: number
  z1: number
  y0: number
  y1: number
}

// One iso box: top diamond + right (east, +x) and left (south, +z) faces with a
// crisp outline. Corners A=far, B=right, C=near, D=left.
// A floor block: an iso box with staggered brick courses hatched on its faces.
function drawIsoCube(
  ctx: CanvasRenderingContext2D,
  cfg: IsoConfig,
  gx: number,
  gz: number,
  bottom: number,
  top: number,
  shades: Shades,
): void {
  // The original's block: solid top, solid left face, checker-hatched right face.
  const b: Box3 = { x0: gx * TILE, x1: (gx + 1) * TILE, z0: gz * TILE, z1: (gz + 1) * TILE, y0: bottom, y1: top }
  const c = boxCorners(cfg, b)
  fillQuad(ctx, [c.Bt, c.Ct, c.Cb, c.Bb], checker(ctx, shades.top))
  fillQuad(ctx, [c.Dt, c.Ct, c.Cb, c.Db], shades.left)
  fillQuad(ctx, [c.At, c.Bt, c.Ct, c.Dt], shades.top)
  outlineBox(ctx, c, '#000', 1)
}

const checkers = new Map<string, CanvasPattern>()

// One-pixel checkerboard of the hue on black, the Spectrum's dithered face.
function checker(ctx: CanvasRenderingContext2D, color: string): CanvasPattern | string {
  const cached = checkers.get(color)
  if (cached) return cached
  const tile = document.createElement('canvas')
  tile.width = 2
  tile.height = 2
  const t = tile.getContext('2d')
  if (!t) return color
  t.fillStyle = '#000'
  t.fillRect(0, 0, 2, 2)
  t.fillStyle = color
  t.fillRect(0, 0, 1, 1)
  t.fillRect(1, 1, 1, 1)
  const pattern = ctx.createPattern(tile, 'repeat')
  if (!pattern) return color
  checkers.set(color, pattern)
  return pattern
}

interface BoxCorners {
  At: ScreenPt; Bt: ScreenPt; Ct: ScreenPt; Dt: ScreenPt
  Bb: ScreenPt; Cb: ScreenPt; Db: ScreenPt
}

type ScreenPt = { sx: number; sy: number }

function boxCorners(cfg: IsoConfig, b: Box3): BoxCorners {
  const top = (wx: number, wz: number) => projectToScreen(wx, b.y1, wz, cfg)
  const bot = (wx: number, wz: number) => projectToScreen(wx, b.y0, wz, cfg)
  return {
    At: top(b.x0, b.z0), Bt: top(b.x1, b.z0), Ct: top(b.x1, b.z1), Dt: top(b.x0, b.z1),
    Bb: bot(b.x1, b.z0), Cb: bot(b.x1, b.z1), Db: bot(b.x0, b.z1),
  }
}

// Crisp silhouette + edges — this is what makes a box read as solid masonry.
function outlineBox(ctx: CanvasRenderingContext2D, c: BoxCorners, color: string, width: number): void {
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.lineWidth = width
  strokePath(ctx, [c.At, c.Bt, c.Ct, c.Dt], true)
  line(ctx, c.Bt, c.Bb)
  line(ctx, c.Ct, c.Cb)
  line(ctx, c.Dt, c.Db)
  line(ctx, c.Bb, c.Cb)
  line(ctx, c.Cb, c.Db)
}



function line(ctx: CanvasRenderingContext2D, a: { sx: number; sy: number }, b: { sx: number; sy: number }): void {
  ctx.beginPath()
  ctx.moveTo(a.sx, a.sy)
  ctx.lineTo(b.sx, b.sy)
  ctx.stroke()
}

function strokePath(ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[], close: boolean): void {
  ctx.beginPath()
  ctx.moveTo(pts[0]!.sx, pts[0]!.sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.sx, pts[i]!.sy)
  if (close) ctx.closePath()
  ctx.stroke()
}

function fillQuad(ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[], color: string | CanvasPattern): void {
  ctx.beginPath()
  ctx.moveTo(pts[0]!.sx, pts[0]!.sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.sx, pts[i]!.sy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}


// Three brightness steps of the room hue (top brightest), plus a darker line.
function toShades(tint: number): Shades {
  const r = (tint >> 16) & 0xff
  const g = (tint >> 8) & 0xff
  const b = tint & 0xff
  const shade = (f: number): string => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`
  return { top: shade(1.0), right: shade(0.62), left: shade(0.4), line: shade(0.22) }
}
