import type { Grid } from '../engine/Grid'

// The original counts heights in pixels, 12 to a block, and 8 pixels make
// one of our units across the floor (a 16-pixel cell is 2 units). What it
// does a frame is done a frame of FrameClock.
export { PIXELS_PER_BLOCK, PIXELS_PER_UNIT } from '../engine/OriginalPixels'

export interface GroundCtx {
  grid?: Grid
  tileSize?: number
}

export interface Faller {
  heightPx: number
  speedPx: number
}

// One frame of the original's mover (0xC700) for something that falls: a
// pixel a frame faster downward, stopped by the ground. True on landing.
export function fallOneStep(body: Faller, groundPx: number): boolean {
  body.speedPx -= 1
  if (body.heightPx + body.speedPx > groundPx) {
    body.heightPx += body.speedPx
    return false
  }
  body.speedPx = groundPx - body.heightPx
  body.heightPx = groundPx
  return true
}

// The top of the highest block under a footprint, no higher than `below`
// (in blocks): what something falling from there comes to rest on.
export function groundUnder(ctx: GroundCtx, x: number, z: number, halfWidth: number, below: number): number {
  const { grid, tileSize } = ctx
  if (!grid || !tileSize) return 0
  let ground = 0
  for (const cell of cellsUnder(x, z, halfWidth, tileSize)) {
    const top = grid.supportHeight(cell.x, cell.z)
    if (top <= below + 1e-6 && top > ground) ground = top
  }
  return ground
}

// True when a footprint would stand clear of the room's walls and of any
// block rising above `height` (in blocks).
export function fitsAt(ctx: GroundCtx, x: number, z: number, halfWidth: number, height: number): boolean {
  const { grid, tileSize } = ctx
  if (!grid || !tileSize) return true
  const inside = x - halfWidth >= 0 && z - halfWidth >= 0 && x + halfWidth <= grid.width * tileSize && z + halfWidth <= grid.depth * tileSize
  return inside && cellsUnder(x, z, halfWidth, tileSize).every((c) => grid.supportHeight(c.x, c.z) <= height + 1e-6)
}

function cellsUnder(x: number, z: number, halfWidth: number, tileSize: number): { x: number; z: number }[] {
  const edge = 1e-6
  const x0 = Math.floor((x - halfWidth + edge) / tileSize)
  const x1 = Math.floor((x + halfWidth - edge) / tileSize)
  const z0 = Math.floor((z - halfWidth + edge) / tileSize)
  const z1 = Math.floor((z + halfWidth - edge) / tileSize)
  const cells = []
  for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) cells.push({ x: cx, z: cz })
  return cells
}
