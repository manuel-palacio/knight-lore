import { doorCell, type Direction, type RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import { ballTop } from '../../../src/scenes/rooms/specBuilder'
import type { Cell } from './game'

// A cell of a path, and the height Sabreman stands at there: 0 on the floor,
// a block's top when he is on one.
export interface Step extends Cell {
  y: number
}

type Target = Cell & { y?: number }

// The cell just inside a doorway of this room, whatever its size.
export function doorOf(spec: RoomSpec, direction: Direction): Cell {
  return doorCell(direction, spec.width ?? 8, spec.depth ?? 8)
}

// Where he must stand to go out by a door: its cell, and for a raised door
// up at its doorway's height (see castle.py).
export function exitOf(spec: RoomSpec, direction: Direction): Target {
  const height = spec.exits.find((e) => e.direction === direction)?.height
  return height ? { ...doorOf(spec, direction), y: height } : doorOf(spec, direction)
}

const key = (c: Cell) => `${c.x},${c.z}`
// Room units to a cell.
const TILE_UNITS = 2
// A search node: where he stands, and the way he came (a high jump needs a run-up).
interface Node {
  at: Step
  from: Node | null
}
const nodeKey = (at: Step, from: Step | null) => `${at.x},${at.z},${at.y}<${from ? `${from.x},${from.z},${from.y}` : ''}`
// How high the man can jump onto a block, and the room he needs to walk
// under one. A tapped jump rises a block; a held one two, but a block's face
// stops him until he is over it, so he needs a run-up for it: the cell he
// jumps from entered from the cell behind it, as high (see Player).
const CLIMB = 1
const HIGH_CLIMB = 2
const HEADROOM = 2

// Breadth-first path over what a walker can stand on: the floor, and block
// tops he can climb to (one block up at a time) or drop from. It keeps to the
// lane off every guard's and ball's line when there is one (and off the
// line a guard walks between two rows), then crosses patrols, then jumps
// single rows of floor spikes (the path skips the spike cell). It passes a
// portcullis only when nothing else will do, and then keeps off patrols if
// it can.
// The way there, and another that keeps off the first one's cells where the
// room has one: a guard's route that runs through a doorway can make the
// first a head-on walk into it.
// `to` may give the height to arrive at (a charm up on a block); otherwise any will do.
export function findFloorPaths(spec: RoomSpec, from: Cell, to: Target): Step[][] {
  const first = findFloorPath(spec, from, to)
  try {
    return [first, findFloorPath(spec, from, to, new Set(first.slice(1, -1).map(key)))]
  } catch {
    return [first]
  }
}

export function findFloorPath(spec: RoomSpec, from: Cell, to: Target, keepOff = new Set<string>()): Step[] {
  const room = new RoomSurfaces(spec)
  // A moving block's track is kept off too: he cannot walk through the block.
  const tracks = (spec.movingPlatforms ?? []).flatMap((m) => cellsBetween(m.from, m.to)).map(key)
  const patrols = new Set([...patrolledCells(spec), ...guardedEdges(spec), ...tracks])
  patrols.delete(key(from))
  patrols.delete(key(to))
  const gates = gateCells(spec)
  // Spiked balls let go at random: he walks under as few of them as he can.
  const underBalls = new Set((spec.spikedBalls ?? []).filter((b) => b.height > 0).map(key))
  const exposed = new Set([...patrols, ...underBalls])
  const tries = [
    { avoid: new Set([...patrols, ...gates]), jumpSpikes: false, crossing: underBalls },
    { avoid: gates, jumpSpikes: false, crossing: exposed },
    { avoid: new Set([...patrols, ...gates]), jumpSpikes: true, crossing: underBalls },
    { avoid: gates, jumpSpikes: true, crossing: exposed },
    { avoid: patrols, jumpSpikes: false, crossing: underBalls },
    { avoid: patrols, jumpSpikes: true, crossing: underBalls },
    { avoid: new Set<string>(), jumpSpikes: false, crossing: exposed },
    { avoid: new Set<string>(), jumpSpikes: true, crossing: exposed },
  ]
  for (const attempt of tries) {
    const avoid = new Set([...attempt.avoid, ...keepOff])
    const path = search(room, { ...attempt, avoid, gates }, { ...from, y: room.heightAt(from) }, to)
    if (path) return path
  }
  throw new Error(`${spec.id}: no floor path ${key(from)} -> ${key(to)}`)
}

// True where two consecutive path cells are two or three apart: a jump over the cells between.
export function isJump(from: Cell, to: Cell): boolean {
  return Math.abs(to.x - from.x) + Math.abs(to.z - from.z) >= 2
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
  // Patrols crossed, and hanging balls walked under, where they must be: as few cells of them as will do.
  crossing?: Set<string>
}

function search(room: RoomSurfaces, rules: SearchRules, from: Step, to: Target): Step[] | undefined {
  const { avoid, jumpSpikes, gates, crossing = new Set<string>() } = rules
  const done = new Set<string>()
  const queue: CostedNode[] = [{ at: from, from: null, cost: 0 }]
  while (queue.length > 0) {
    const node = queue.shift()!
    const at = node.at
    if (done.has(nodeKey(at, node.from?.at ?? null))) continue
    done.add(nodeKey(at, node.from?.at ?? null))
    if (at.x === to.x && at.z === to.z && (to.y === undefined || at.y === to.y)) return rebuild(node)
    for (const next of [...room.moves(at, node.from?.at ?? null), ...(jumpSpikes ? room.spikeJumps(at) : [])]) {
      const alongGrille = gates.has(key(at)) && gates.has(key(next))
      if (done.has(nodeKey(next, at)) || avoid.has(key(next)) || avoid.has(edgeKey(at, next)) || alongGrille) continue
      const exposed = crossing.has(key(next)) || crossing.has(edgeKey(at, next))
      enqueue(queue, { at: next, from: node, cost: node.cost + 1 + (exposed ? PATROL_COST : 0) })
    }
  }
  return undefined
}

// A cell on a patrol weighs as many as this many cells off it: the way that
// spends fewest steps on patrols, then the shortest.
const PATROL_COST = 100

interface CostedNode extends Node {
  cost: number
}

// In order of cost, first come first served among equals (breadth first when
// nothing is weighed).
function enqueue(queue: CostedNode[], node: CostedNode): void {
  const after = queue.findIndex((n) => n.cost > node.cost)
  queue.splice(after < 0 ? queue.length : after, 0, node)
}

// Where a walker can stand in each cell of a room, and what stops him.
class RoomSurfaces {
  private readonly width: number
  private readonly depth: number
  private readonly columns = new Map<string, number>()
  private readonly hanging = new Map<string, number[]>()
  // A collapsing block is gone two frames after it is stood on: it can be
  // walked under, never stood on.
  private readonly overhead = new Map<string, number[]>()
  // The tops of falling blocks: stood on, they sink.
  private readonly sinking = new Map<string, number[]>()
  private readonly floorBlocked = new Set<string>()
  private readonly floorSpikes = new Set<string>()
  private readonly hazardHeights = new Map<string, number[]>()

  constructor(spec: RoomSpec) {
    this.width = spec.width ?? 8
    this.depth = spec.depth ?? 8
    for (const p of spec.platforms ?? []) this.columns.set(key(p), p.height)
    // Walkers take boxes as they stand, a pile of them as tall as it is.
    for (const b of [...(spec.boxes ?? [])].sort((a, b) => a.height - b.height)) {
      this.columns.set(key(b), Math.max(this.columns.get(key(b)) ?? 0, b.height) + 1)
    }
    for (const b of spec.floatingBlocks ?? []) this.hang(b, b.bottom)
    // A falling block sinks only while stood on.
    for (const v of spec.fallingBlocks ?? []) {
      this.hang(v, v.height - 1)
      this.sinking.set(key(v), [...(this.sinking.get(key(v)) ?? []), v.height])
    }
    for (const v of spec.vanishing ?? []) this.overhead.set(key(v), [...(this.overhead.get(key(v)) ?? []), v.height - 1])
    // A moving block is solid to his whole body wherever it sways: every cell
    // of its track holds it, stood on (it carries him) or under with head room.
    for (const m of spec.movingPlatforms ?? []) for (const c of cellsBetween(m.from, m.to)) this.hang(c, m.height - 1)
    // The cauldron stands where four cells meet, over all four; the wizard in one.
    if (spec.cauldron) for (const c of cellsUnder(spec.cauldron)) this.floorBlocked.add(key(c))
    if (spec.wizard) this.floorBlocked.add(key(cellAt(spec.wizard)))
    // A gargoyle kills at a touch: its top is not stood on (see Gargoyle).
    for (const d of spec.decor ?? []) if (d.kind === 'gargoyle') this.addHazard(d, d.height + 1)
    for (const s of spec.spikes ?? []) {
      if (s.height) this.addHazard(s, s.height)
      else this.floorSpikes.add(key(s))
    }
    // Spiked balls are walked under while they hang: they let go one at a
    // time, a second or so apart, so a room of them is crossed before they
    // are down (and in odd-numbered rooms they wait for a pick-up there).
    for (const b of spec.spikedBalls ?? []) this.addHazard(b, b.height)
  }

  heightAt(c: Cell): number {
    return this.columns.get(key(c)) ?? 0
  }

  // Walk or drop to a neighbour at any height he can stand at there, or
  // climb onto a block no more than a jump above him.
  moves(at: Step, cameFrom: Step | null): Step[] {
    return this.neighbours(at).flatMap((n) => {
      const inLine = cameFrom !== null && cameFrom.y === at.y && n.x - at.x === at.x - cameFrom.x && n.z - at.z === at.z - cameFrom.z
      const reach = at.y + (inLine ? HIGH_CLIMB : CLIMB)
      return this.standings(n).filter((y) => y <= reach && (y < at.y ? this.dropsInto(n, at.y, y) : y === at.y || this.climbsFrom(at, y))).map((y) => ({ ...n, y }))
    })
  }

  // Walking off a ledge he goes into the next cell at the ledge's height and
  // drops to where he lands: nothing may hang there across his body, nor
  // catch him on the way down.
  private dropsInto(to: Cell, ledge: number, landing: number): boolean {
    const over = [...(this.hanging.get(key(to)) ?? []), ...(this.overhead.get(key(to)) ?? [])]
    return over.every((bottom) => bottom + 1 <= landing || bottom >= ledge + HEADROOM)
  }

  // A climb needs firm footing: not a falling block, which sinks under him
  // as he makes ready to jump (see FallingBlock).
  private climbsFrom(from: Step, to: number): boolean {
    return !(this.sinking.get(key(from)) ?? []).includes(from.y) && this.headroomToClimb(from, to)
  }

  // A climb rises from where he stands to his landing height: nothing may
  // hang over him on the way up (the blocks are solid to his whole body).
  private headroomToClimb(from: Step, to: number): boolean {
    const over = [...(this.hanging.get(key(from)) ?? []), ...(this.overhead.get(key(from)) ?? [])]
    return over.every((bottom) => bottom < from.y || bottom >= to + HEADROOM)
  }

  // A jump over one cell whose dangers all lie on the floor (spikes, a
  // spiked ball lying there), to the floor beyond, when nothing hangs in the
  // air above them for the jump to run into.
  // A held jump carries about five units: over one cell, or over two of
  // spikes (a spiked ball stands too tall for the ends of so long a jump).
  spikeJumps(at: Step): Step[] {
    if (at.y !== 0) return []
    const jumpable = (c: Cell) => {
      const low = this.hazardHeights.get(key(c)) ?? []
      const clear = !this.columns.has(key(c)) && !this.hanging.has(key(c)) && !this.overhead.has(key(c))
      return clear && (this.floorSpikes.has(key(c)) || low.length > 0) && low.every((h) => h === 0)
    }
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap(([dx, dz]) => [1, 2]
      .filter((span) => Array.from({ length: span }, (_, k) => ({ x: at.x + (k + 1) * dx!, z: at.z + (k + 1) * dz! }))
        .every((c) => jumpable(c) && (span === 1 || !this.hazardHeights.has(key(c)))))
      .map((span) => ({ x: at.x + (span + 1) * dx!, z: at.z + (span + 1) * dz!, y: 0 }))
      .filter((n) => this.inRoom(n) && this.standings(n).includes(0)))
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
    const overhead = [...hanging, ...(this.overhead.get(key(c)) ?? [])]
    if (floorOk && overhead.every((bottom) => bottom >= base + HEADROOM || bottom < base)) heights.push(base)
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

// What a walker waits for on his way through a room: the cells guards and
// balls pass over, and each guard's loop of corners.
export interface RoomDangers {
  // The room itself, to plan jumps in (see jumping.ts).
  spec?: RoomSpec
  patrolled: Set<string>
  guardedEdges: Set<string>
  routes: Cell[][]
  // How high the room's balls bounce, in blocks.
  ballTop: number
}

export function dangersOf(spec: RoomSpec): RoomDangers {
  const routes = [...(spec.pathGuards ?? []).map((g) => g.path), ...flameRoutes(spec)]
  return { spec, patrolled: patrolledCells(spec), guardedEdges: guardedEdges(spec), routes, ballTop: ballTop(spec) }
}

// A flame goes to and fro along its axis at a guard's pace (see Flame), over
// the cells at its own level, turning half a unit short of whatever stops it
// (it is 0.8 across and moves a quarter unit at a time): a guard with a
// route of two corners, a quarter cell past the end cells' centres.
export function flameRoutes(spec: RoomSpec): Cell[][] {
  return (spec.flames ?? []).map((f) => {
    const [lo, hi] = flameLane(spec, f)
    const along = (at: number) => (f.axis === 'x' ? { x: at, z: f.z } : { x: f.x, z: at })
    return [along(lo - 0.25), along(hi + 0.25)]
  })
}

function flameLane(spec: RoomSpec, flame: NonNullable<RoomSpec['flames']>[number]): [number, number] {
  const heights = new Map((spec.platforms ?? []).map((p) => [key(p), p.height]))
  const length = flame.axis === 'x' ? spec.width ?? 8 : spec.depth ?? 8
  const start = flame.axis === 'x' ? flame.x : flame.z
  const level = (at: number) => heights.get(key(flame.axis === 'x' ? { x: at, z: flame.z } : { x: flame.x, z: at })) ?? 0
  let lo = start
  let hi = start
  while (lo > 0 && level(lo - 1) === flame.height) lo--
  while (hi < length - 1 && level(hi + 1) === flame.height) hi++
  return [lo, hi]
}

// The cells a guard passes through, each leg of its loop stepped one cell at
// a time towards the next corner, and the cells a ball bounces over: both
// are crossed on the walker's timing (a guard's back, a ball up high). A
// guard walking between two rows touches neither row's middle: see guardedEdges.
export function patrolledCells(spec: RoomSpec): Set<string> {
  const cells = new Set<string>()
  for (const point of guardPoints(spec)) if (Number.isInteger(point.x) && Number.isInteger(point.z)) cells.add(key(point))
  for (const ball of spec.balls ?? []) for (const c of coveredCells(ball)) cells.add(key(c))
  for (const [a, b] of flameRoutes(spec)) {
    for (let x = Math.ceil(a!.x); x <= Math.floor(b!.x); x++) for (let z = Math.ceil(a!.z); z <= Math.floor(b!.z); z++) cells.add(key({ x, z }))
  }
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

// A cell at a time, and the last step short where an end is half way between cells.
function pointsBetween(from: Cell, to: Cell): Cell[] {
  const at = { ...from }
  const points = [{ ...at }]
  const towards = (a: number, b: number) => a + Math.max(-1, Math.min(1, b - a))
  while (at.x !== to.x || at.z !== to.z) {
    at.x = towards(at.x, to.x)
    at.z = towards(at.z, to.z)
    points.push({ ...at })
  }
  return points
}

function rebuild(end: Node): Step[] {
  const path: Step[] = []
  for (let node: Node | null = end; node; node = node.from) path.unshift(node.at)
  return path
}

// The cell a point in room units lies in.
function cellAt(at: { x: number; z: number }): Cell {
  return { x: Math.floor(at.x / TILE_UNITS), z: Math.floor(at.z / TILE_UNITS) }
}

// The cells touching a point: four where cells meet, else the one it is in.
function cellsUnder(at: { x: number; z: number }): Cell[] {
  const near = 0.01
  const xs = [...new Set([at.x - near, at.x + near].map((x) => Math.floor(x / TILE_UNITS)))]
  const zs = [...new Set([at.z - near, at.z + near].map((z) => Math.floor(z / TILE_UNITS)))]
  return xs.flatMap((x) => zs.map((z) => ({ x, z })))
}
