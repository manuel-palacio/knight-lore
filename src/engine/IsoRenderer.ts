import { projectToScreen, isoDepth, type IsoConfig } from './IsoProjection'
import type { Grid } from './Grid'

// 2D Filmation renderer. Draws the simulation (grid solids + dynamic entities) as
// monochrome isometric cubes plus character/item sprites, depth-sorted back-to-front
// (painter's algorithm). One hue per room on a black void floor — the ZX look.

const TILE = 2
const WALL_HEIGHT = 4 // world units; back walls are two tiles tall

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
  private readonly pixelScale: number

  constructor(container: HTMLElement, width: number, height: number, pixelScale = 2) {
    this.pixelScale = pixelScale
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.width = `${width * pixelScale}px`
    this.canvas.style.height = `${height * pixelScale}px`
    this.canvas.style.imageRendering = 'pixelated'
    container.appendChild(this.canvas)
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    this.ctx = ctx
    this.ctx.imageSmoothingEnabled = false

    // Centre an 8x8 room: world x/z span 0..16, so screen x spans ±128 at
    // tileW=32. Place the origin so the room sits centred with headroom for walls.
    const tileW = 36
    const tileH = 18
    this.cfg = {
      tile: TILE,
      tileW,
      tileH,
      heightScale: tileH,
      originX: width / 2,
      originY: height * 0.32,
    }
  }

  get config(): IsoConfig {
    return this.cfg
  }

  render(room: { grid: Grid; tint: number; exits?: { direction: string }[] }, dynamics: Dynamic[]): void {
    const ctx = this.ctx
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const shades = toShades(room.tint)
    const items: Renderable[] = []

    // Doorways: punch a gap in the back wall at each north/west exit's middle cell;
    // every exit also gets a brick arch. South/east exits sit on the open
    // camera-facing edges, so they get an arch but no wall to cut.
    const exits = room.exits ?? []
    const midX = Math.floor(room.grid.width / 2)
    const midZ = Math.floor(room.grid.depth / 2)
    const skipNorth = exits.some((e) => e.direction === 'north') ? midX : null
    const skipWest = exits.some((e) => e.direction === 'west') ? midZ : null

    // Back walls: a frame of tall cubes one cell behind the north (z) and west (x)
    // edges, so the room reads as enclosed without occluding the camera-facing side.
    for (let gx = -1; gx < room.grid.width; gx++) {
      if (gx === skipNorth) continue
      items.push(this.cube(gx, -1, WALL_HEIGHT, shades))
    }
    for (let gz = 0; gz < room.grid.depth; gz++) {
      if (gz === skipWest) continue
      items.push(this.cube(-1, gz, WALL_HEIGHT, shades))
    }

    for (const e of exits) items.push(this.archItem(e.direction, room.grid, shades))

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

  private archItem(direction: string, grid: Grid, shades: Shades): Renderable {
    const w = grid.width * TILE
    const d = grid.depth * TILE
    const cx = Math.floor(grid.width / 2) * TILE + TILE / 2
    const cz = Math.floor(grid.depth / 2) * TILE + TILE / 2
    let bx = cx
    let bz = 0
    if (direction === 'south') bz = d
    else if (direction === 'west') { bx = 0; bz = cz }
    else if (direction === 'east') { bx = w; bz = cz }
    return {
      gx: bx / TILE,
      gz: bz / TILE,
      height: WALL_HEIGHT,
      depth: isoDepth(bx, 0, bz),
      draw: (ctx, cfg) => {
        const p = projectToScreen(bx, 0, bz, cfg)
        drawArch(ctx, p.sx, p.sy, shades)
      },
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
export function spriteDynamic(s: SpriteDraw): Dynamic {
  return { x: s.x, y: s.y, z: s.z, draw: (ctx, cfg) => blitSprite(ctx, cfg, s) }
}

function blitSprite(ctx: CanvasRenderingContext2D, cfg: IsoConfig, s: SpriteDraw): void {
  const feet = projectToScreen(s.x, s.y, s.z, cfg)
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

// One iso cube: top diamond + right (east, +x) and left (south, +z) faces, with
// brick-hatch lines. Corners A=far, B=right, C=near, D=left.
function drawIsoCube(
  ctx: CanvasRenderingContext2D,
  cfg: IsoConfig,
  gx: number,
  gz: number,
  height: number,
  shades: Shades,
): void {
  const x0 = gx * TILE
  const x1 = x0 + TILE
  const z0 = gz * TILE
  const z1 = z0 + TILE
  const top = (wx: number, wz: number) => projectToScreen(wx, height, wz, cfg)
  const bot = (wx: number, wz: number) => projectToScreen(wx, 0, wz, cfg)

  const At = top(x0, z0)
  const Bt = top(x1, z0)
  const Ct = top(x1, z1)
  const Dt = top(x0, z1)
  const Bb = bot(x1, z0)
  const Cb = bot(x1, z1)
  const Db = bot(x0, z1)

  const rows = Math.max(2, Math.round(height * 2)) // ~2 brick courses per world unit

  // Right (east) face, then left (south) face — fill, then staggered brickwork.
  fillQuad(ctx, [Bt, Ct, Cb, Bb], shades.right)
  brickFace(ctx, Bt, Ct, Bb, Cb, rows, shades.line)
  fillQuad(ctx, [Dt, Ct, Cb, Db], shades.left)
  brickFace(ctx, Dt, Ct, Db, Cb, rows, shades.line)
  // Top diamond
  fillQuad(ctx, [At, Bt, Ct, Dt], shades.top)

  // Crisp silhouette + edges — this is what makes the cube read as solid masonry.
  ctx.lineJoin = 'round'
  ctx.strokeStyle = shades.line
  ctx.lineWidth = 1.5
  strokePath(ctx, [At, Bt, Ct, Dt], true)
  line(ctx, Bt, Bb)
  line(ctx, Ct, Cb)
  line(ctx, Dt, Db)
  line(ctx, Bb, Cb)
  line(ctx, Cb, Db)
}

function facePoint(
  tA: { sx: number; sy: number },
  tB: { sx: number; sy: number },
  bA: { sx: number; sy: number },
  bB: { sx: number; sy: number },
  u: number,
  t: number,
): { sx: number; sy: number } {
  return lerp(lerp(tA, tB, u), lerp(bA, bB, u), t)
}

// Staggered brick courses on a quad face (tA-tB top edge, bA-bB bottom edge).
function brickFace(
  ctx: CanvasRenderingContext2D,
  tA: { sx: number; sy: number },
  tB: { sx: number; sy: number },
  bA: { sx: number; sy: number },
  bB: { sx: number; sy: number },
  rows: number,
  color: string,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  const cols = 2
  for (let i = 1; i < rows; i++) {
    line(ctx, lerp(tA, bA, i / rows), lerp(tB, bB, i / rows)) // course line
  }
  for (let i = 0; i < rows; i++) {
    const off = (i % 2) * 0.5
    for (let j = 0; j <= cols; j++) {
      const u = (j + off) / cols
      if (u <= 0 || u >= 1) continue
      line(ctx, facePoint(tA, tB, bA, bB, u, i / rows), facePoint(tA, tB, bA, bB, u, (i + 1) / rows))
    }
  }
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

// A stacked-brick doorway: two jamb columns and a voussoir arch ring around a
// black opening, with mortar joints. Drawn front-facing at the doorway base.
function drawArch(ctx: CanvasRenderingContext2D, sx: number, sy: number, shades: Shades): void {
  const w = 19 // outer half-width
  const t = 8 // ring/jamb thickness
  const cy = sy - 30 // arc centre (springline)
  const ringPt = (r: number, theta: number): { sx: number; sy: number } => ({
    sx: sx + r * Math.cos(theta),
    sy: cy - r * Math.sin(theta),
  })

  // Outer silhouette: jambs + outer semicircle.
  ctx.fillStyle = shades.right
  ctx.beginPath()
  ctx.moveTo(sx - w, sy)
  ctx.lineTo(sx - w, cy)
  ctx.arc(sx, cy, w, Math.PI, 0, false)
  ctx.lineTo(sx + w, sy)
  ctx.closePath()
  ctx.fill()

  // Black opening.
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.moveTo(sx - w + t, sy)
  ctx.lineTo(sx - w + t, cy)
  ctx.arc(sx, cy, w - t, Math.PI, 0, false)
  ctx.lineTo(sx + w - t, sy)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = shades.line
  ctx.lineWidth = 1
  // Voussoir joints (radial) around the arch ring.
  for (let k = 0; k <= 6; k++) {
    const theta = (k / 6) * Math.PI
    line(ctx, ringPt(w - t, theta), ringPt(w, theta))
  }
  // Jamb courses (horizontal) on both columns.
  for (let y = sy - 7; y > cy; y -= 8) {
    line(ctx, { sx: sx - w, sy: y }, { sx: sx - w + t, sy: y })
    line(ctx, { sx: sx + w - t, sy: y }, { sx: sx + w, sy: y })
  }

  // Crisp outline of the whole doorway.
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(sx - w, sy)
  ctx.lineTo(sx - w, cy)
  ctx.arc(sx, cy, w, Math.PI, 0, false)
  ctx.lineTo(sx + w, sy)
  ctx.stroke()
}

function fillQuad(ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[], color: string): void {
  ctx.beginPath()
  ctx.moveTo(pts[0]!.sx, pts[0]!.sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.sx, pts[i]!.sy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function lerp(a: { sx: number; sy: number }, b: { sx: number; sy: number }, t: number): { sx: number; sy: number } {
  return { sx: a.sx + (b.sx - a.sx) * t, sy: a.sy + (b.sy - a.sy) * t }
}

// Three brightness steps of the room hue (top brightest), plus a darker line.
function toShades(tint: number): Shades {
  const r = (tint >> 16) & 0xff
  const g = (tint >> 8) & 0xff
  const b = tint & 0xff
  const shade = (f: number): string => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`
  return { top: shade(1.0), right: shade(0.62), left: shade(0.4), line: shade(0.22) }
}
