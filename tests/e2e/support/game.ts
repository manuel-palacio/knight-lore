import { expect, type Page } from '@playwright/test'
import { edgeKey, isClimb, isJump, type RoomDangers, type Step } from './roomPath'
import { jumpFrom, planJump, type JumpPlan } from './jumping'
import type { RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import { centreOf, guardTrack, safeToCross, safeUnderBall, shouldWalkOn, sightingBefore, walkerTrack, type Point, type Sighting } from './crossing'
import { PIXELS_PER_BLOCK } from '../../../src/game/Gravity'
import { TICKS_PER_FRAME, TICKS_PER_STEP } from '../../../src/engine/StepClock'

// Drives the dev build through its window hooks (__dbg, __room, __pos,
// __timer) and the real keyboard. Only `vite` dev exposes the hooks.

export interface Debug {
  room: string
  form: string
  facing: string
  state: string
  // Dissolving into stars, or coming back out of them (see Sparkle).
  dying: boolean
  pos: { x: number; y: number; z: number }
  wanted: string | null
  overCauldron: string | null
  platforms: { x: number; z: number }[]
  carrying: string[]
  delivered: number
  lives: number
  day: number
  won: boolean
  timer: number
  night: boolean
  gates: { cells: Cell[]; state: string; blocking: boolean; openFramesLeft: number }[]
  spikedBalls: { x: number; y: number; z: number }[]
  fallingBlocks: { x: number; top: number; z: number }[]
  // How each is got past: behind a patrol, under a bounce, or by luck with a wanderer.
  monsters: { kind: 'patrols' | 'bounces' | 'roams'; x: number; y: number; z: number }[]
  pickups: { id: string; x: number; y: number; z: number }[]
  cauldron: { x: number; y: number; z: number } | null
}

export interface Cell {
  x: number
  z: number
}

type Hooks = {
  __dbg: () => Debug
  __room: (id: string, x?: number, z?: number) => void
  __pos: (x: number, y: number, z: number) => void
  __timer: (seconds: number) => void
  __give: (ids: string[]) => void
}

const TILE = 2
const NO_NIGHTFALL = 99_999
// Positions move a quarter unit a step: stop on the cell's centre line, not a step short of it.
const STEP_TOLERANCE = 0.2

export function tileCentre(cell: number): number {
  return cell * TILE + TILE / 2
}

export function debug(page: Page): Promise<Debug> {
  return page.evaluate(() => (window as unknown as Hooks).__dbg())
}

export async function startGame(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.locator('#intro')).toBeVisible()
  await page.waitForFunction(() => '__dbg' in window)
  await page.keyboard.press('Enter')
  await expect(page.locator('#intro')).toBeHidden()
}

export async function holdDaylight(page: Page): Promise<void> {
  await page.evaluate((seconds) => (window as unknown as Hooks).__timer(seconds), NO_NIGHTFALL)
}

export async function enterRoom(page: Page, id: string, at?: { x: number; z: number }): Promise<Debug> {
  // A life just lost plays out first: he comes back at the door of the room he lost it in.
  await expect.poll(async () => (await debug(page)).dying, { timeout: 10_000 }).toBe(false)
  await page.evaluate(
    ({ room, x, z }) => (window as unknown as Hooks).__room(room, x, z),
    { room: id, x: at?.x, z: at?.z },
  )
  await expect.poll(async () => (await debug(page)).room).toBe(id)
  return debug(page)
}

export async function give(page: Page, charms: string[]): Promise<void> {
  await page.evaluate((ids) => (window as unknown as Hooks).__give(ids), charms)
  await expect.poll(async () => (await debug(page)).carrying.length).toBe(charms.length)
}

export async function standAt(page: Page, at: { x: number; y: number; z: number }): Promise<void> {
  await page.evaluate(({ x, y, z }) => (window as unknown as Hooks).__pos(x, y, z), at)
}

// Turns are dropped while the transformation or a door's wipe plays, so
// keep turning until the facing is right rather than for a fixed count, and
// turn the short way round: Right turns clockwise on screen, south to west.
const CLOCKWISE = ['south', 'west', 'north', 'east']

export async function face(page: Page, facing: string): Promise<void> {
  await expect
    .poll(async () => {
      const current = (await debug(page)).facing
      if (current !== facing) await page.keyboard.press(shortTurn(current, facing))
      return current
    }, { timeout: 5_000, intervals: [150] })
    .toBe(facing)
}

function shortTurn(from: string, to: string): string {
  const quarterTurnsRight = (CLOCKWISE.indexOf(to) - CLOCKWISE.indexOf(from) + 4) % 4
  return quarterTurnsRight <= 2 ? 'ArrowRight' : 'ArrowLeft'
}

// Holds forward until arrived, letting go while a ghost or a hopping ball
// would meet him sooner walking on than standing (see crossing.ts).
export async function walkUntil(page: Page, arrived: (state: Debug) => boolean): Promise<void> {
  const sightings: Sighting[] = []
  const wanderers = (await debug(page)).monsters.some((m) => m.kind === 'roams')
  let walking = true
  await page.keyboard.down('ArrowUp')
  try {
    await expect.poll(async () => {
      const state = await debug(page)
      if (arrived(state)) return true
      const now = { at: Date.now(), wanderers: state.monsters.filter((m) => m.kind === 'roams') }
      if (now.wanderers.length === 0) return false
      const walkOn = shouldWalkOn(state.pos, FACING_STEP[state.facing]!, now, sightingBefore(sightings, now.at))
      sightings.push(now)
      if (walkOn !== walking) await (walkOn ? page.keyboard.down('ArrowUp') : page.keyboard.up('ArrowUp'))
      walking = walkOn
      return false
    }, { timeout: wanderers ? 30_000 : 10_000, intervals: [20] }).toBe(true)
  } finally {
    await page.keyboard.up('ArrowUp')
  }
}

const FACING_STEP: Record<string, Point> = { north: { x: 0, z: -1 }, south: { x: 0, z: 1 }, east: { x: 1, z: 0 }, west: { x: -1, z: 0 } }

// Walks cell to cell along a path of orthogonal neighbours: first onto the
// centre of the cell it starts in, then one straight run per corner. Where
// the path skips a cell (a spike row, see roomPath.ts) it jumps it from the
// tile before; where the next cell is higher, it jumps up onto it.
export async function walkPath(page: Page, path: Step[], dangers: RoomDangers = { patrolled: new Set(), guardedEdges: new Set(), routes: [], ballTop: 0 }): Promise<void> {
  const { gates, room } = await debug(page)
  const gateAt = (c: Cell) => gates.findIndex((g) => g.cells.some((gc) => gc.x === c.x && gc.z === c.z))
  const onPatrol = (c: Cell) => dangers.patrolled.has(`${c.x},${c.z}`)
  const guarded = (i: number) => onPatrol(path[i]!) || dangers.guardedEdges.has(edgeKey(path[i - 1]!, path[i]!))
  const intoPatrol = (i: number) => i < path.length && guarded(i) && !onPatrol(path[i - 1]!)
  const underGrille = (i: number) => gateAt(path[i]!) >= 0
  // The first cell past the run of cells from i that are all `within`.
  const pastRun = (i: number, within: (j: number) => boolean) => {
    let past = i
    while (past < path.length && within(past)) past++
    return past
  }
  // Where a patrol and a grille lie back to back, both are waited for before
  // the first of them: he never stands under the one waiting for the other.
  const waitedFor = new Set<number>()
  await waitForWanderersAway(page)
  // Come in on a guard's route (it walks past the doorways): he waits there
  // for it to be clear of the way ahead, as he would before stepping onto it.
  if (path.length > 1 && onPatrol(path[0]!)) await waitForPatrolsClear(page, path[0]!, walkerTrack(path, 0, dangers), dangers)
  let start = 0
  for (let i = 1; i <= path.length; i++) {
    const leap = i < path.length && (isJump(path[i - 1]!, path[i]!) || isClimb(path[i - 1]!, path[i]!))
    const plan = leap && dangers.spec ? await planJump(dangers.spec, path, i) : undefined
    if (intoPatrol(i) && !waitedFor.has(i)) {
      await walkRun(page, path.slice(start, i), plan?.at)
      const walker = walkerTrack(path, i - 1, dangers)
      const grille = pastRun(i, guarded)
      if (grille < path.length && underGrille(grille)) {
        waitedFor.add(grille)
        await waitForGateOpen(page, gateAt(path[grille]!), grille - (i - 1), () => patrolsClear(page, path[i]!, walker, dangers))
      } else {
        await waitForPatrolsClear(page, path[i]!, walker, dangers)
      }
      start = i - 1
    }
    const intoGate = i < path.length && underGrille(i) && !underGrille(i - 1) && !waitedFor.has(i)
    if (i < path.length && !leap && !intoGate) continue
    await walkRun(page, path.slice(start, i), plan?.at)
    if (intoGate) {
      const patrol = pastRun(i, underGrille)
      const patrolClear = intoPatrol(patrol) ? () => patrolsClear(page, path[patrol]!, walkerTrack(path, i - 1, dangers, patrol), dangers) : undefined
      if (patrolClear) waitedFor.add(patrol)
      await waitForGateOpen(page, gateAt(path[i]!), 1, patrolClear)
      start = i - 1
      continue
    }
    if (i < path.length) await jumpTo(page, path, i, dangers.spec, plan)
    // A jump at a doorway can carry him out through it: he is where he was going.
    if ((await debug(page)).room !== room) return
    start = i
  }
}

// Of the ways to go, the first he can set off on at once without meeting a
// guard: one coming in on a guard's route may otherwise walk into it.
export async function clearestPath(page: Page, paths: Step[][], dangers: RoomDangers): Promise<Step[]> {
  for (const path of paths) {
    const onPatrol = dangers.patrolled.has(`${path[0]!.x},${path[0]!.z}`)
    if (!onPatrol || (await patrolsClear(page, path[0]!, walkerTrack(path, 0, dangers), dangers))) return path
  }
  return paths[0]!
}

// Ghosts and hopping balls wander at random, the ghosts faster than he
// walks: he sets off once every one is well away from him, or after a while
// regardless.
const WANDERERS_AWAY = 6
const WANDERER_PATIENCE_MS = 8_000

async function waitForWanderersAway(page: Page): Promise<void> {
  const giveUpAt = Date.now() + WANDERER_PATIENCE_MS
  while (Date.now() < giveUpAt) {
    const state = await debug(page)
    const away = (m: Debug['monsters'][number]) => Math.hypot(m.x - state.pos.x, m.z - state.pos.z) >= WANDERERS_AWAY
    if (state.monsters.filter((m) => m.kind === 'roams').every(away)) return
    await page.waitForTimeout(LOOK_AGAIN_MS)
  }
}

// A guard's route is crossed when Sabreman, walking on, would never touch it,
// and a ball, which bounces where it stands, is passed under when it will be
// over his head all the while he is within reach of it (see crossing.ts).
// Anything else is left behind once it is a little way off and going away
// (or standing still), never while it is coming back.
const PATROL_CLEARANCE = 3
const LOOK_AGAIN_MS = 120

async function waitForPatrolsClear(page: Page, cell: Cell, walker: Point[], dangers: RoomDangers): Promise<void> {
  await expect.poll(() => patrolsClear(page, cell, walker, dangers), { timeout: 30_000, intervals: [20] }).toBe(true)
}

// One look, two samples apart, at every monster in the room.
async function patrolsClear(page: Page, cell: Cell, walker: Point[], dangers: RoomDangers): Promise<boolean> {
  const routes = dangers.routes.map((r) => r.map(centreOf))
  const x = tileCentre(cell.x)
  const z = tileCentre(cell.z)
  const distanceTo = (m: Debug['monsters'][number]) => Math.hypot(m.x - x, m.z - z)
  const before = await debug(page)
  await page.waitForTimeout(LOOK_AGAIN_MS)
  const after = await debug(page)
  return after.monsters.every((m, i) => {
    const was = before.monsters[i]!
    // A guard seen standing (turning back at an end) cannot be foreseen yet: look again.
    if (m.kind === 'patrols' && routes.length > 0) {
      const route = routes.find((r) => guardTrack(r, was, m, 0))
      return route !== undefined && safeToCross(walker, (steps) => guardTrack(route, was, m, steps))
    }
    if (distanceTo(m) >= PATROL_CLEARANCE && (m.kind === 'bounces' || distanceTo(m) >= distanceTo(was))) return true
    const overHead = (height: number) => (height - after.pos.y) * PIXELS_PER_BLOCK
    return m.kind === 'bounces' && m.y > was.y && safeUnderBall(walker, m, overHead(m.y), overHead(dangers.ballTop))
  })
}

// A portcullis is crossed only once it has risen all the way, and with time
// to spare before it falls: eight steps a cell to its grille, and three more
// for his body to be clear of it, in its frames, and a few more in hand. A
// gate still rising may fall on the way. Waiting for a guard beside it as
// well can take a few of its rises.
const STEPS_A_CELL = 8
const STEPS_TO_CLEAR_GRILLE = 3
const FRAMES_IN_HAND = 3

async function waitForGateOpen(page: Page, gate: number, cellsAway: number, patrolClear?: () => Promise<boolean>): Promise<void> {
  const steps = cellsAway * STEPS_A_CELL + STEPS_TO_CLEAR_GRILLE
  const framesNeeded = Math.ceil((steps * TICKS_PER_STEP) / TICKS_PER_FRAME) + FRAMES_IN_HAND
  const open = async () => (await debug(page)).gates[gate]!.openFramesLeft >= framesNeeded && (!patrolClear || (await patrolClear()))
  await expect.poll(open, { timeout: patrolClear ? 60_000 : 30_000, intervals: [50] }).toBe(true)
}

// A run starts where he stands (off the centre, after a jump): he lines up
// across the way he is going, never turning back along it. It ends on the
// last cell's centre, or at `endAt` there (a jump's take-off), lined up
// across the jump before stepping along it.
async function walkRun(page: Page, run: Cell[], endAt?: { x: number; z: number }): Promise<void> {
  const alongX = run.length > 1 && run[1]!.x !== run[0]!.x
  const corners = cornersOf(run)
  for (const [i, corner] of corners.entries()) {
    const last = i === corners.length - 1
    const target = last && endAt ? endAt : { x: tileCentre(corner.x), z: tileCentre(corner.z) }
    const jumpAlongX = last && endAt !== undefined && endAt.x !== tileCentre(corner.x)
    const axes: ('x' | 'z')[] = jumpAlongX ? ['z', 'x'] : ['x', 'z']
    for (const axis of axes) {
      const firstOfRun = i === 0 && run.length > 1 && (axis === 'x') === alongX
      if (!firstOfRun) await walkAxisTo(page, axis, target[axis])
    }
  }
}

// A jump is committed: from the take-off point planJump found (or, with no
// room to plan in, where he stands with Space held), facing the way, Space
// down, and up again at once for a low jump or once landed for a high one.
async function jumpTo(page: Page, path: Step[], into: number, spec?: RoomSpec, plan?: JumpPlan): Promise<void> {
  const from = path[into - 1]!
  const to = path[into]!
  const facing = to.x > from.x ? 'east' : to.x < from.x ? 'west' : to.z > from.z ? 'south' : 'north'
  const held = spec && plan ? await takeOffFor(page, spec, path, into, plan) : true
  await face(page, facing)
  if (held) await page.keyboard.down('Space')
  else await page.keyboard.press('Space')
  try {
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).not.toBe('grounded')
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).toBe('grounded')
  } finally {
    await page.keyboard.up('Space')
  }
}

// Walks to the planned take-off and settles, from where he stopped, whether
// to hold Space; walks there again if from there no jump would land.
async function takeOffFor(page: Page, spec: RoomSpec, path: Step[], into: number, plan: JumpPlan): Promise<boolean> {
  for (let tries = 0; tries < 3; tries++) {
    const now = await debug(page)
    const held = await jumpFrom(spec, path, into, now.pos, now.fallingBlocks)
    if (held !== undefined) return held
    plan = await planJump(spec, path, into, now.fallingBlocks)
    await walkAxisTo(page, 'x', plan.at.x)
    await walkAxisTo(page, 'z', plan.at.z)
  }
  return plan.held
}

async function walkAxisTo(page: Page, axis: 'x' | 'z', target: number): Promise<void> {
  const delta = target - (await debug(page)).pos[axis]
  if (Math.abs(delta) <= STEP_TOLERANCE) return
  const forward = delta > 0
  await face(page, axis === 'x' ? (forward ? 'east' : 'west') : (forward ? 'south' : 'north'))
  await walkUntil(page, (s) => (forward ? s.pos[axis] >= target - STEP_TOLERANCE : s.pos[axis] <= target + STEP_TOLERANCE))
}

function cornersOf(path: Cell[]): Cell[] {
  return path.filter((cell, i) => {
    if (i === 0 || i === path.length - 1) return true
    const before = path[i - 1]!
    const after = path[i + 1]!
    return (before.x === cell.x) !== (cell.x === after.x)
  })
}
