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
    // Depth from the near corner (max x/z) so a cube paints after everything behind it.
    const nearX = (gx + 1) * TILE
    const nearZ = (gz + 1) * TILE
    return {
      gx,
      gz,
      height,
      depth: isoDepth(nearX, height, nearZ),
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

  // Right (east) face
  fillQuad(ctx, [Bt, Ct, Cb, Bb], shades.right)
  hatch(ctx, Bt, Ct, Bb, Cb, shades.line)
  // Left (south) face
  fillQuad(ctx, [Dt, Ct, Cb, Db], shades.left)
  hatch(ctx, Dt, Ct, Db, Cb, shades.line)
  // Top diamond
  fillQuad(ctx, [At, Bt, Ct, Dt], shades.top)
}

// A brick horseshoe doorway: outer arch in the wall hue with a black opening and
// a few course lines. Drawn front-facing at the doorway base (screen point).
function drawArch(ctx: CanvasRenderingContext2D, sx: number, sy: number, shades: Shades): void {
  const w = 17 // half width
  const h = 50 // total height
  const t = 6 // wall thickness
  const springY = sy - (h - w) // where the semicircle springs from

  const outer = (): void => {
    ctx.beginPath()
    ctx.moveTo(sx - w, sy)
    ctx.lineTo(sx - w, springY)
    ctx.arc(sx, springY, w, Math.PI, 0, false)
    ctx.lineTo(sx + w, sy)
    ctx.closePath()
  }
  ctx.fillStyle = shades.right
  outer()
  ctx.fill()

  // Opening
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.moveTo(sx - w + t, sy)
  ctx.lineTo(sx - w + t, springY)
  ctx.arc(sx, springY, w - t, Math.PI, 0, false)
  ctx.lineTo(sx + w - t, sy)
  ctx.closePath()
  ctx.fill()

  // Course lines on the jambs
  ctx.strokeStyle = shades.line
  ctx.lineWidth = 1
  for (let y = sy - 8; y > springY; y -= 10) {
    ctx.beginPath()
    ctx.moveTo(sx - w, y)
    ctx.lineTo(sx - w + t, y)
    ctx.moveTo(sx + w - t, y)
    ctx.lineTo(sx + w, y)
    ctx.stroke()
  }
}

function fillQuad(ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[], color: string): void {
  ctx.beginPath()
  ctx.moveTo(pts[0]!.sx, pts[0]!.sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.sx, pts[i]!.sy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

// Brick-hatch a face: a few lines parallel to the top edge (tTop→tBot is one
// vertical edge, bTop... actually we draw horizontal courses between the two
// vertical edges defined by (e0Top,e0Bot) and (e1Top,e1Bot)).
function hatch(
  ctx: CanvasRenderingContext2D,
  e0Top: { sx: number; sy: number },
  e1Top: { sx: number; sy: number },
  e0Bot: { sx: number; sy: number },
  e1Bot: { sx: number; sy: number },
  color: string,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  const courses = 4
  for (let i = 1; i < courses; i++) {
    const t = i / courses
    const a = lerp(e0Top, e0Bot, t)
    const b = lerp(e1Top, e1Bot, t)
    ctx.beginPath()
    ctx.moveTo(a.sx, a.sy)
    ctx.lineTo(b.sx, b.sy)
    ctx.stroke()
  }
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
