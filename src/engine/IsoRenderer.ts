import { projectToScreen, isoDepth, filmationConfig, type IsoConfig } from './IsoProjection'
import type { Grid } from './Grid'
import { buildWallLayout, type ExitDirection, type WallBox } from './WallLayout'

// 2D Filmation renderer. Draws the simulation (grid solids + dynamic entities) as
// monochrome isometric cubes plus character/item sprites, depth-sorted back-to-front
// (painter's algorithm). One hue per room on a black void floor — the ZX look.

const TILE = 2

export interface Renderable {
  // World footprint origin (min corner) in grid cells and the column height.
  gx: number
  gz: number
  height: number
  // Sort key uses the cell's NEAR corner (max x/z) so taller/closer things paint last.
  draw: (ctx: CanvasRenderingContext2D, cfg: IsoConfig) => void
  depth: number
}

export interface Shades {
  top: string
  right: string
  left: string
  line: string
}

export class IsoRenderer {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private cfg: IsoConfig

  constructor(container: HTMLElement, width: number, height: number, pixelScale = 2) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.maxWidth = `${width * pixelScale}px`
    this.canvas.style.imageRendering = 'pixelated'
    container.appendChild(this.canvas)
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    this.ctx = ctx
    this.ctx.imageSmoothingEnabled = false

    this.cfg = filmationConfig(width, height)
  }

  get config(): IsoConfig {
    return this.cfg
  }

  clear(): void {
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  render(room: { grid: Grid; tint: number; exits?: { direction: string }[] }, dynamics: Dynamic[]): void {
    const ctx = this.ctx
    this.clear()

    const shades = toShades(room.tint)
    const items: Renderable[] = []

    // Back walls and doorway arches, brick by brick (see WallLayout).
    const exits = (room.exits ?? []).map((e) => e.direction as ExitDirection)
    for (const b of buildWallLayout(room.grid.width, room.grid.depth, exits, TILE)) {
      items.push(this.brick(b, shades))
    }

    // Solid floor cells (static blocks, push blocks) as cubes sized by support height.
    for (let gz = 0; gz < room.grid.depth; gz++) {
      for (let gx = 0; gx < room.grid.width; gx++) {
        if (!room.grid.isSolid(gx, gz)) continue
        const h = room.grid.supportHeight(gx, gz) || 1
        items.push(this.cube(gx, gz, h, shades))
      }
    }

    // Dynamic visuals (character, items, enemies, set-pieces) at their world depth.
    for (const d of dynamics) {
      items.push({
        gx: d.x / TILE,
        gz: d.z / TILE,
        height: 0,
        depth: d.depth ?? isoDepth(d.x, d.y, d.z),
        draw: (c, cfg) => d.draw(c, cfg, shades),
      })
    }

    items.sort((a, b) => a.depth - b.depth)
    for (const it of items) it.draw(ctx, this.cfg)
  }

  private brick(b: WallBox, shades: Shades): Renderable {
    const cx = (b.x0 + b.x1) / 2
    const cz = (b.z0 + b.z1) / 2
    return {
      gx: b.x0 / TILE,
      gz: b.z0 / TILE,
      height: b.y1,
      depth: isoDepth(cx, b.y0, cz),
      draw: (ctx, cfg) => drawIsoBox(ctx, cfg, b, shades),
    }
  }

  private cube(gx: number, gz: number, height: number, shades: Shades): Renderable {
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
      height,
      depth: isoDepth(cx, 0, cz),
      draw: (ctx, cfg) => drawIsoCube(ctx, cfg, gx, gz, height, shades),
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
}

// Build a Dynamic that blits a sprite frame anchored at its feet (world point).
// A depth-sorted solid box (moving platform) in the room's shades.
export function boxDynamic(b: Box3): Dynamic {
  const cx = (b.x0 + b.x1) / 2
  const cz = (b.z0 + b.z1) / 2
  return { x: cx, y: b.y0, z: cz, draw: (ctx, cfg, shades) => drawIsoBox(ctx, cfg, b, shades) }
}

export function spriteDynamic(s: SpriteDraw): Dynamic {
  return { x: s.x, y: s.y, z: s.z, draw: (ctx, cfg) => blitSprite(ctx, cfg, s) }
}

function blitSprite(ctx: CanvasRenderingContext2D, cfg: IsoConfig, s: SpriteDraw): void {
  const projected = projectToScreen(s.x, s.y, s.z, cfg)
  const feet = { sx: Math.round(projected.sx), sy: Math.round(projected.sy) }
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
function drawIsoBox(ctx: CanvasRenderingContext2D, cfg: IsoConfig, b: Box3, shades: Shades): void {
  const c = boxCorners(cfg, b)
  fillQuad(ctx, [c.Bt, c.Ct, c.Cb, c.Bb], shades.right)
  fillQuad(ctx, [c.Dt, c.Ct, c.Cb, c.Db], shades.left)
  fillQuad(ctx, [c.At, c.Bt, c.Ct, c.Dt], shades.top)
  outlineBox(ctx, c, shades.line, 1)
}

// A floor block: an iso box with staggered brick courses hatched on its faces.
function drawIsoCube(
  ctx: CanvasRenderingContext2D,
  cfg: IsoConfig,
  gx: number,
  gz: number,
  height: number,
  shades: Shades,
): void {
  // The original's block: solid top, solid left face, checker-hatched right face.
  const b: Box3 = { x0: gx * TILE, x1: (gx + 1) * TILE, z0: gz * TILE, z1: (gz + 1) * TILE, y0: 0, y1: height }
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
