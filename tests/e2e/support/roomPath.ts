import { doorCell, type Direction, type RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import type { Cell } from './game'

// A cell of a path, and the height Sabreman stands at there: 0 on the floor,
// a block's top when he is on one.
export interface Step extends Cell {
  y: number
}

// The cell just inside a doorway of this room, whatever its size.
export function doorOf(spec: RoomSpec, direction: Direction): Cell {
  return doorCell(direction, spec.width ?? 8, spec.depth ?? 8)
}

const key = (c: Cell) => `${c.x},${c.z}`
const stateKey = (s: Step) => `${s.x},${s.z},${s.y}`
// How high the man can jump onto a block, and the room he needs to walk under one.
const CLIMB = 1
const HEADROOM = 2

// Breadth-first path over what a walker can stand on: the floor, and block
// tops he can climb to (one block up at a time) or drop from. It keeps to the
// lane off every guard's and ball's line when there is one, then crosses
// patrols, then jumps single rows of floor spikes (the path skips the spike
// cell), and passes a portcullis only when nothing else will do.
export function findFloorPath(spec: RoomSpec, from: Cell, to: Cell): Step[] {
  const room = new RoomSurfaces(spec)
  const patrols = patrolledCells(spec)
  patrols.delete(key(from))
  patrols.delete(key(to))
  const gates = gateCells(spec)
  const tries = [
    { avoid: new Set([...patrols, ...gates]), jumpSpikes: false },
    { avoid: gates, jumpSpikes: false },
    { avoid: new Set([...patrols, ...gates]), jumpSpikes: true },
    { avoid: gates, jumpSpikes: true },
    { avoid: new Set<string>(), jumpSpikes: false },
    { avoid: new Set<string>(), jumpSpikes: true },
  ]
  for (const attempt of tries) {
    const path = search(room, attempt.avoid, attempt.jumpSpikes, { ...from, y: room.heightAt(from) }, to)
    if (path) return path
  }
  throw new Error(`${spec.id}: no floor path ${key(from)} -> ${key(to)}`)
}

// True where two consecutive path cells are two apart: a jump over the cell between.
export function isJump(from: Cell, to: Cell): boolean {
  return Math.abs(to.x - from.x) + Math.abs(to.z - from.z) === 2
}

// True where the next step is up onto a higher block: a climbing jump.
export function isClimb(from: Step, to: Step): boolean {
  return to.y > from.y
}

function search(room: RoomSurfaces, avoid: Set<string>, jumpSpikes: boolean, from: Step, to: Cell): Step[] | undefined {
  const cameFrom = new Map<string, Step | null>([[stateKey(from), null]])
  const queue = [from]
  while (queue.length > 0) {
    const at = queue.shift()!
    if (at.x === to.x && at.z === to.z) return rebuild(cameFrom, at)
    for (const next of [...room.moves(at), ...(jumpSpikes ? room.spikeJumps(at) : [])]) {
      if (cameFrom.has(stateKey(next)) || avoid.has(key(next))) continue
      cameFrom.set(stateKey(next), at)
      queue.push(next)
    }
  }
  return undefined
}

// Where a walker can stand in each cell of a room, and what stops him.
class RoomSurfaces {
  private readonly width: number
  private readonly depth: number
  private readonly columns = new Map<string, number>()
  private readonly hanging = new Map<string, number[]>()
  private readonly floorBlocked = new Set<string>()
  private readonly floorSpikes = new Set<string>()
  private readonly hazardHeights = new Map<string, number[]>()

  constructor(spec: RoomSpec) {
    this.width = spec.width ?? 8
    this.depth = spec.depth ?? 8
    for (const p of spec.platforms ?? []) this.columns.set(key(p), p.height)
    for (const p of spec.pushBlocks ?? []) this.columns.set(key(p), 1)
    for (const b of spec.floatingBlocks ?? []) this.hang(b, b.bottom)
    // A collapsing block holds long enough to cross; a table is stood on, not under.
    for (const v of spec.vanishing ?? []) this.hang(v, v.height - 1)
    for (const t of spec.tables ?? []) {
      this.floorBlocked.add(key(t))
      this.hang(t, t.height - 1)
    }
    if (spec.cauldron) this.floorBlocked.add(key(spec.cauldron))
    for (const s of spec.spikes ?? []) {
      if (s.height) this.addHazard(s, s.height)
      else this.floorSpikes.add(key(s))
    }
    for (const f of spec.flames ?? []) this.addHazard(f, f.height)
    for (const b of spec.spikedBalls ?? []) this.addHazard(b, b.height)
  }

  heightAt(c: Cell): number {
    return this.columns.get(key(c)) ?? 0
  }

  // Walk or drop to a neighbour at any height he can stand at there, or
  // climb onto a block no more than a jump above him.
  moves(at: Step): Step[] {
    return this.neighbours(at).flatMap((n) => this.standings(n).filter((y) => y <= at.y + CLIMB).map((y) => ({ ...n, y })))
  }

  // A jump over one cell of floor spikes, to the floor beyond, when nothing
  // hangs in the air above them for the jump to run into.
  spikeJumps(at: Step): Step[] {
    if (at.y !== 0) return []
    const clearSpikes = (c: Cell) => this.floorSpikes.has(key(c)) && !this.hazardHeights.has(key(c))
    return [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .filter(([dx, dz]) => clearSpikes({ x: at.x + dx!, z: at.z + dz! }))
      .map(([dx, dz]) => ({ x: at.x + 2 * dx!, z: at.z + 2 * dz!, y: 0 }))
      .filter((n) => this.inRoom(n) && this.standings(n).includes(0))
  }

  // The heights he can stand at in a cell: its column top (or the floor, if
  // nothing hangs too low over it), and the top of any block hanging there,
  // less those a hazard occupies.
  private standings(c: Cell): number[] {
    const column = this.columns.get(key(c))
    const hanging = this.hanging.get(key(c)) ?? []
    const base = column ?? 0
    const floorOk = column !== undefined || (!this.floorBlocked.has(key(c)) && !this.floorSpikes.has(key(c)))
    const heights: number[] = []
    if (floorOk && hanging.every((bottom) => bottom >= base + HEADROOM || bottom < base)) heights.push(base)
    for (const bottom of hanging) if (bottom >= base) heights.push(bottom + 1)
    const hazards = this.hazardHeights.get(key(c)) ?? []
    return heights.filter((y) => !hazards.some((h) => h >= y && h < y + HEADROOM))
  }

  private hang(c: Cell, bottom: number): void {
    this.hanging.set(key(c), [...(this.hanging.get(key(c)) ?? []), bottom])
  }

  private addHazard(c: Cell, height: number): void {
    this.hazardHeights.set(key(c), [...(this.hazardHeights.get(key(c)) ?? []), height])
  }

  private inRoom(c: Cell): boolean {
    return c.x >= 0 && c.z >= 0 && c.x < this.width && c.z < this.depth
  }

  private neighbours(c: Cell): Cell[] {
    return [
      { x: c.x + 1, z: c.z }, { x: c.x - 1, z: c.z }, { x: c.x, z: c.z + 1 }, { x: c.x, z: c.z - 1 },
    ].filter((n) => this.inRoom(n))
  }
}

// The cells a guard or a ball passes through: each leg of its loop stepped
// one cell at a time towards the next waypoint on each axis, as the ball
// moves (a ball's line is a loop of two).
export function patrolledCells(spec: RoomSpec): Set<string> {
  const routes = [...(spec.pathGuards ?? []).map((g) => g.path), ...(spec.balls ?? []).map((b) => [b.from, b.to])]
  const cells = new Set<string>()
  for (const route of routes) {
    route.forEach((start, i) => {
      const end = route[(i + 1) % route.length]!
      for (const c of cellsBetween(start, end)) cells.add(key(c))
    })
  }
  return cells
}

export function gateCells(spec: RoomSpec): Set<string> {
  const cells = new Set<string>()
  for (const gate of spec.portcullises ?? []) for (const c of cellsBetween(gate.from, gate.to)) cells.add(key(c))
  return cells
}

function cellsBetween(from: Cell, to: Cell): Cell[] {
  const at = { ...from }
  const cells = [{ ...at }]
  while (at.x !== to.x || at.z !== to.z) {
    at.x += Math.sign(to.x - at.x)
    at.z += Math.sign(to.z - at.z)
    cells.push({ ...at })
  }
  return cells
}

function rebuild(cameFrom: Map<string, Step | null>, end: Step): Step[] {
  const path = [end]
  let previous = cameFrom.get(stateKey(end))
  while (previous) {
    path.unshift(previous)
    previous = cameFrom.get(stateKey(previous))
  }
  return path
}
