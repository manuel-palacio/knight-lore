// Filmation room walls as a list of world-space bricks. Pure data so the layout
// is unit-tested; IsoRenderer just draws boxes. The look copies the original:
// solid corner columns joined by a sparse, see-through lattice of floating
// slabs, and tall pointed brick arches for doorways.

export const WALL_HEIGHT = 4
const COURSE = 0.5
const BRICK = 1
const THICK = 0.25
const JAMB_HEIGHT = 2.5
const JAMB_WIDTH = 1
const ARCH_THICK = 0.5
const VOUSSOIR = 0.75
const VOUSSOIRS_PER_SIDE = 6
const DOOR_HALF_WIDTH = 1
const DOOR_CLEARANCE = 0.25

export type ExitDirection = 'north' | 'south' | 'east' | 'west'

export interface WallBox {
  x0: number
  x1: number
  z0: number
  z1: number
  y0: number
  y1: number
  kind: 'wall' | 'arch'
}

// A wall plane described in its own axis: `along` runs the wall's length,
// `across` is its thickness. `toWorld` maps (along, across) to world (x, z).
interface WallPlane {
  length: number
  toWorld: (along: number, across: number) => { x: number; z: number }
}

export function buildWallLayout(width: number, depth: number, exits: ExitDirection[], tile: number): WallBox[] {
  const w = width * tile
  const d = depth * tile
  const midX = Math.floor(width / 2) * tile + tile / 2
  const midZ = Math.floor(depth / 2) * tile + tile / 2
  const northPlane: WallPlane = { length: w, toWorld: (a, c) => ({ x: a, z: -THICK + c }) }
  const westPlane: WallPlane = { length: d, toWorld: (a, c) => ({ x: -THICK + c, z: a }) }
  const southPlane: WallPlane = { length: w, toWorld: (a, c) => ({ x: a, z: d + c }) }
  const eastPlane: WallPlane = { length: d, toWorld: (a, c) => ({ x: w + c, z: a }) }

  const boxes: WallBox[] = []
  const seed = width * 73 + depth * 131 + exits.length * 17
  const northDoor = exits.includes('north') ? midX : null
  const westDoor = exits.includes('west') ? midZ : null

  boxes.push(...column(northPlane, -THICK, BRICK))
  boxes.push(...column(northPlane, w - BRICK, BRICK))
  boxes.push(...column(westPlane, d - BRICK, BRICK))
  boxes.push(...lattice(northPlane, BRICK, w - BRICK, northDoor, seed))
  boxes.push(...lattice(westPlane, THICK, d - BRICK, westDoor, seed + 1))

  if (northDoor !== null) boxes.push(...arch(northPlane, northDoor))
  if (westDoor !== null) boxes.push(...arch(westPlane, westDoor))
  if (exits.includes('south')) boxes.push(...arch(southPlane, midX))
  if (exits.includes('east')) boxes.push(...arch(eastPlane, midZ))
  return boxes
}

function column(plane: WallPlane, start: number, length: number): WallBox[] {
  const out: WallBox[] = []
  for (let y = 0; y < WALL_HEIGHT; y += COURSE) out.push(box(plane, start, start + length, y, y + COURSE, 'wall'))
  return out
}

// Runs of one to three slabs separated by gaps, staggered per course like
// running bond, skipping the doorway span. Deterministic per room.
function lattice(plane: WallPlane, from: number, to: number, door: number | null, seed: number): WallBox[] {
  const rand = mulberry32(seed)
  const out: WallBox[] = []
  for (let course = 0; course * COURSE < WALL_HEIGHT; course++) {
    const y = course * COURSE
    let along = from + (course % 2) * (BRICK / 2)
    while (along + BRICK <= to) {
      const run = 1 + Math.floor(rand() * 3)
      for (let i = 0; i < run && along + BRICK <= to; i++) {
        if (!inDoorway(along, along + BRICK, door)) out.push(box(plane, along, along + BRICK, y, y + COURSE, 'wall'))
        along += BRICK
      }
      along += (2 + Math.floor(rand() * 3)) * BRICK
    }
  }
  return out
}

function inDoorway(a0: number, a1: number, door: number | null): boolean {
  if (door === null) return false
  const half = DOOR_HALF_WIDTH + JAMB_WIDTH + DOOR_CLEARANCE
  return a0 < door + half && a1 > door - half
}

// Two slab jambs joined by a pointed arch: each side is a circular arc whose
// centre is offset past the doorway centre, so the two arcs meet at a point.
// Small voussoir bricks are laid along the arc, like the original's blocky ring.
function arch(plane: WallPlane, centre: number): WallBox[] {
  const out: WallBox[] = []
  const outer = DOOR_HALF_WIDTH + JAMB_WIDTH
  for (let y = 0; y < JAMB_HEIGHT; y += COURSE) {
    out.push(box(plane, centre - outer, centre - DOOR_HALF_WIDTH, y, y + COURSE, 'arch', ARCH_THICK))
    out.push(box(plane, centre + DOOR_HALF_WIDTH, centre + outer, y, y + COURSE, 'arch', ARCH_THICK))
  }
  const ringRadius = outer - JAMB_WIDTH / 2
  const arcOffset = 0.6
  const arcRadius = ringRadius + arcOffset
  const apexAngle = Math.acos(arcOffset / arcRadius)
  for (let k = 0; k <= VOUSSOIRS_PER_SIDE; k++) {
    const theta = (k / VOUSSOIRS_PER_SIDE) * apexAngle
    const along = arcOffset - arcRadius * Math.cos(theta)
    const y = JAMB_HEIGHT + arcRadius * Math.sin(theta)
    for (const side of k === VOUSSOIRS_PER_SIDE ? [1] : [-1, 1]) {
      const a = centre + side * along
      out.push(box(plane, a - VOUSSOIR / 2, a + VOUSSOIR / 2, y - COURSE / 2, y + COURSE / 2, 'arch', ARCH_THICK))
    }
  }
  return out
}

function box(
  plane: WallPlane,
  a0: number,
  a1: number,
  y0: number,
  y1: number,
  kind: WallBox['kind'],
  thickness = THICK,
): WallBox {
  const p0 = plane.toWorld(a0, 0)
  const p1 = plane.toWorld(a1, thickness)
  return {
    x0: Math.min(p0.x, p1.x),
    x1: Math.max(p0.x, p1.x),
    z0: Math.min(p0.z, p1.z),
    z1: Math.max(p0.z, p1.z),
    y0,
    y1,
    kind,
  }
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
