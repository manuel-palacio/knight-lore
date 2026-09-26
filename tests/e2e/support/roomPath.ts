import { doorCell, type Direction, type RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import { ballTop } from '../../../src/scenes/rooms/specBuilder'
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
// lane off every guard's and ball's line when there is one (and off the
// line a guard walks between two rows), then crosses patrols, then jumps
// single rows of floor spikes (the path skips the spike cell). It passes a
// portcullis only when nothing else will do, and then keeps off patrols if
// it can.
export function findFloorPath(spec: RoomSpec, from: Cell, to: Cell): Step[] {
  const room = new RoomSurfaces(spec)
  // A moving block's track is kept off too: he cannot walk through the block.
  const tracks = (spec.movingPlatforms ?? []).flatMap((m) => cellsBetween(m.from, m.to)).map(key)
  const patrols = new Set([...patrolledCells(spec), ...guardedEdges(spec), ...tracks])
  patrols.delete(key(from))
  patrols.delete(key(to))
  const gates = gateCells(spec)
  const tries = [
    { avoid: new Set([...patrols, ...gates]), jumpSpikes: false },
    { avoid: gates, jumpSpikes: false },
    { avoid: new Set([...patrols, ...gates]), jumpSpikes: true },
    { avoid: gates, jumpSpikes: true },
    { avoid: patrols, jumpSpikes: false },
    { avoid: patrols, jumpSpikes: true },
    { avoid: new Set<string>(), jumpSpikes: false },
    { avoid: new Set<string>(), jumpSpikes: true },
  ]
  for (const attempt of tries) {
    const path = search(room, { ...attempt, gates }, { ...from, y: room.heightAt(from) }, to)
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

interface SearchRules {
  avoid: Set<string>
  jumpSpikes: boolean
  // A grille is crossed straight through, never walked along under.
  gates: Set<string>
}

function search(room: RoomSurfaces, rules: SearchRules, from: Step, to: Cell): Step[] | undefined {
  const { avoid, jumpSpikes, gates } = rules
  const cameFrom = new Map<string, Step | null>([[stateKey(from), null]])
  const queue = [from]
  while (queue.length > 0) {
    const at = queue.shift()!
    if (at.x === to.x && at.z === to.z) return rebuild(cameFrom, at)
    for (const next of [...room.moves(at), ...(jumpSpikes ? room.spikeJumps(at) : [])]) {
      const alongGrille = gates.has(key(at)) && gates.has(key(next))
      if (cameFrom.has(stateKey(next)) || avoid.has(key(next)) || avoid.has(edgeKey(at, next)) || alongGrille) continue
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
    // A collapsing block holds long enough to cross, a falling one sinks only
    // while stood on; a table is stood on, not under.
    for (const v of [...(spec.vanishing ?? []), ...(spec.fallingBlocks ?? [])]) this.hang(v, v.height - 1)
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
    // The room's dropper lets go in the end, and lies where it lands.
    for (const b of spec.spikedBalls ?? []) this.addHazard(b, b.drops ? this.groundUnder(b, b.height) : b.height)
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

  private groundUnder(c: Cell, height: number): number {
    const tops = (this.hanging.get(key(c)) ?? []).map((bottom) => bottom + 1).filter((top) => top <= height)
    return Math.max(this.heightAt(c), ...tops)
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

// What a walker waits for on his way through a room: the cells guards and
// balls pass over, and each guard's loop of corners.
export interface RoomDangers {
  patrolled: Set<string>
  guardedEdges: Set<string>
  routes: Cell[][]
  // How high the room's balls bounce, in blocks.
  ballTop: number
}

export function dangersOf(spec: RoomSpec): RoomDangers {
  return { patrolled: patrolledCells(spec), guardedEdges: guardedEdges(spec), routes: (spec.pathGuards ?? []).map((g) => g.path), ballTop: ballTop(spec) }
}

// The cells a guard passes through, each leg of its loop stepped one cell at
// a time towards the next corner, and the cells a ball bounces over: both
// are crossed on the walker's timing (a guard's back, a ball up high). A
// guard walking between two rows touches neither row's middle: see guardedEdges.
export function patrolledCells(spec: RoomSpec): Set<string> {
  const cells = new Set<string>()
  for (const point of guardPoints(spec)) if (Number.isInteger(point.x) && Number.isInteger(point.z)) cells.add(key(point))
  for (const ball of spec.balls ?? []) for (const c of coveredCells(ball)) cells.add(key(c))
  return cells
}

// The steps from one row to the next across the line a guard walks between them.
export function guardedEdges(spec: RoomSpec): Set<string> {
  const edges = new Set<string>()
  for (const point of guardPoints(spec)) {
    const [a, b] = coveredCells(point)
    if (b && (Number.isInteger(point.x) || Number.isInteger(point.z))) edges.add(edgeKey(a!, b))
  }
  return edges
}

export function edgeKey(a: Cell, b: Cell): string {
  return [key(a), key(b)].sort().join('|')
}

function guardPoints(spec: RoomSpec): Cell[] {
  return (spec.pathGuards ?? []).flatMap(({ path }) => path.flatMap((start, i) => pointsBetween(start, path[(i + 1) % path.length]!)))
}

// The cells under something on a cell, or half a cell over (x or z ends in .5).
export function coveredCells(at: Cell): Cell[] {
  const xs = [...new Set([Math.floor(at.x), Math.ceil(at.x)])]
  const zs = [...new Set([Math.floor(at.z), Math.ceil(at.z)])]
  return xs.flatMap((x) => zs.map((z) => ({ x, z })))
}

export function gateCells(spec: RoomSpec): Set<string> {
  const cells = new Set<string>()
  for (const gate of spec.portcullises ?? []) for (const c of cellsBetween(gate.from, gate.to)) cells.add(key(c))
  return cells
}

function cellsBetween(from: Cell, to: Cell): Cell[] {
  return pointsBetween(from, to).flatMap(coveredCells)
}

function pointsBetween(from: Cell, to: Cell): Cell[] {
  const at = { ...from }
  const points = [{ ...at }]
  while (at.x !== to.x || at.z !== to.z) {
    at.x += Math.sign(to.x - at.x)
    at.z += Math.sign(to.z - at.z)
    points.push({ ...at })
  }
  return points
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
