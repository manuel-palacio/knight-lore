import { edgeKey, isClimb, isJump, type RoomDangers, type Step } from './roomPath'
import type { Cell } from './game'
import { TICKS_PER_FRAME, TICKS_PER_STEP } from '../../../src/engine/StepClock'
import { GUARD_STEP } from '../../../src/game/PathGuard'
import { RISE_PER_FRAME_PX } from '../../../src/game/BouncingBall'
import { PIXELS_PER_BLOCK } from '../../../src/game/Gravity'

// Foresees a crossing of a guard's route or a ball's bounce: where Sabreman
// will be, step by step, as he walks the path through the patrolled cells
// (a quarter unit a step, jumping or not), and where the
// guard or the ball will be on the original's frame clock (a guard a
// quarter unit a frame, a frame a step and a half). Safe when the two never
// touch, even if he sets off a few steps later than foreseen.

export interface Point {
  x: number
  z: number
}

const TILE = 2
const WALK_STRIDE = 0.25
// A jump carries him on at his walking pace (see Player).
const JUMP_STRIDE = WALK_STRIDE
const GUARD_STRIDE = GUARD_STEP * (TICKS_PER_STEP / TICKS_PER_FRAME)
// Both bodies are 0.8 across: they touch closer than 0.8, and a margin.
const TOUCH = 0.8 + 0.1
// He may set off up to a third of a second later than foreseen (the test
// driving the keys is that slow at worst), however many steps that is.
const LATE_BY_STEPS = Math.ceil(333 / ((1000 * TICKS_PER_STEP) / 60))
const ON_LEG = 1e-6

export function centreOf(cell: Cell): Point {
  return { x: cell.x * TILE + TILE / 2, z: cell.z * TILE + TILE / 2 }
}

// Sabreman's positions, one a step, from the centre of path[from] through the
// patrolled cells (and across guarded lines) from path[enters] on, and one
// cell beyond. A turn costs a step.
export function walkerTrack(path: Step[], from: number, dangers: RoomDangers, enters = from + 1): Point[] {
  const guarded = (i: number) => dangers.patrolled.has(`${path[i]!.x},${path[i]!.z}`) || dangers.guardedEdges.has(edgeKey(path[i - 1]!, path[i]!))
  let last = Math.max(enters, from + 1)
  while (last < path.length - 1 && guarded(last)) last++
  let at = centreOf(path[from]!)
  let heading: Point | null = null
  const track = [at]
  for (let i = from + 1; i <= Math.min(last, path.length - 1); i++) {
    const target = centreOf(path[i]!)
    const next = { x: Math.sign(target.x - at.x), z: Math.sign(target.z - at.z) }
    for (let t = 0; t < quarterTurns(heading, next); t++) track.push(at)
    heading = next
    const stride = isJump(path[i - 1]!, path[i]!) || isClimb(path[i - 1]!, path[i]!) ? JUMP_STRIDE : WALK_STRIDE
    while (at.x !== target.x || at.z !== target.z) {
      at = { x: approach(at.x, target.x, stride), z: approach(at.z, target.z, stride) }
      track.push(at)
    }
  }
  return track
}

// The guard's positions, one a step, from where it is now, going the way it
// was seen to move; null when it cannot be placed on its route.
export function guardTrack(route: Point[], before: Point, now: Point, steps: number): Point[] | null {
  const leg = route.findIndex((a, i) => movingAlong(a, route[(i + 1) % route.length]!, before, now))
  if (leg < 0) return null
  let target = (leg + 1) % route.length
  let at = now
  const track = [at]
  while (track.length <= steps) {
    let stride = GUARD_STRIDE
    while (stride > ON_LEG) {
      const goal = route[target]!
      const gap = Math.abs(goal.x - at.x) + Math.abs(goal.z - at.z)
      const move = Math.min(stride, gap)
      at = { x: approach(at.x, goal.x, move), z: approach(at.z, goal.z, move) }
      stride -= move
      if (gap <= move + ON_LEG) target = (target + 1) % route.length
    }
    track.push(at)
  }
  return track
}

// True when Sabreman, setting off now or up to LATE_BY_STEPS later, never
// comes within touching distance of the guard.
export function safeToCross(walker: Point[], guard: (steps: number) => Point[] | null): boolean {
  const foreseen = guard(walker.length + LATE_BY_STEPS)
  if (!foreseen) return false
  for (let late = 0; late <= LATE_BY_STEPS; late++) {
    for (let t = 0; t < walker.length + late; t++) {
      const me = walker[Math.max(0, t - late)]!
      const it = foreseen[t]!
      if (Math.abs(me.x - it.x) < TOUCH && Math.abs(me.z - it.z) < TOUCH) return false
    }
  }
  return true
}

// True when a ball, rising now at heightPx, stays over his head for every
// step he is within reach of it (setting off now or a few steps late). It
// rises two pixels a frame to topPx and falls back a pixel a frame faster
// each frame (see BouncingBall).
export function safeUnderBall(walker: Point[], ball: Point, heightPx: number, topPx: number): boolean {
  const reach = walker.map((me) => Math.abs(me.x - ball.x) < TOUCH && Math.abs(me.z - ball.z) < TOUCH)
  const heights = ballHeights(heightPx, topPx, walker.length + LATE_BY_STEPS)
  for (let late = 0; late <= LATE_BY_STEPS; late++) {
    for (let t = 0; t < walker.length; t++) {
      if (reach[t] && heights[t + late]! < HEAD_CLEARANCE_PX) return false
    }
  }
  return true
}

// Sabreman is 1.6 blocks tall: a ball clears him from 19.2 pixels up.
const HEAD_CLEARANCE_PX = 1.6 * PIXELS_PER_BLOCK + 1

function ballHeights(risingFromPx: number, topPx: number, steps: number): number[] {
  const byFrame = [risingFromPx]
  let height = risingFromPx
  let speed = RISE_PER_FRAME_PX
  let rising = true
  while (byFrame.length <= steps) {
    if (rising) {
      height += RISE_PER_FRAME_PX
      rising = height <= topPx
    } else {
      speed -= 1
      height = Math.max(0, height + speed)
    }
    byFrame.push(height)
  }
  return Array.from({ length: steps + 1 }, (_, t) => byFrame[Math.floor((t * TICKS_PER_STEP) / TICKS_PER_FRAME)]!)
}

function movingAlong(a: Point, b: Point, before: Point, now: Point): boolean {
  const onLeg = (p: Point) =>
    (a.x === b.x ? Math.abs(p.x - a.x) < ON_LEG : Math.abs(p.z - a.z) < ON_LEG) &&
    p.x >= Math.min(a.x, b.x) - ON_LEG && p.x <= Math.max(a.x, b.x) + ON_LEG &&
    p.z >= Math.min(a.z, b.z) - ON_LEG && p.z <= Math.max(a.z, b.z) + ON_LEG
  const moved = { x: now.x - before.x, z: now.z - before.z }
  const towardB = moved.x * (b.x - a.x) + moved.z * (b.z - a.z) > 0
  return onLeg(now) && towardB
}

function quarterTurns(from: Point | null, to: Point): number {
  if (!from) return 0
  if (from.x === to.x && from.z === to.z) return 0
  return from.x === -to.x && from.z === -to.z ? 2 : 1
}

function approach(value: number, target: number, stride: number): number {
  return value < target ? Math.min(target, value + stride) : Math.max(target, value - stride)
}

// Dodging what wanders (ghosts, hopping balls): each drifts in a straight
// line between the walls, so a little way ahead it can be foreseen from where
// it was seen a moment ago. Sabreman walks on unless walking would bring him
// into one sooner than standing still would.
const STEP_MS = (1000 * TICKS_PER_STEP) / 60
const LOOK_BACK_MS = 150
const DODGE_HORIZON_STEPS = Math.ceil(830 / STEP_MS)
// A ghost is 0.9 across and he 0.8: they touch closer than 0.85, and a margin.
const WANDERER_TOUCH = 0.85 + 0.25

export interface Sighting {
  at: number
  wanderers: Point[]
}

export function shouldWalkOn(me: Point, heading: Point, now: Sighting, before: Sighting | undefined): boolean {
  if (!before || before.wanderers.length !== now.wanderers.length) return true
  const steps = (now.at - before.at) / STEP_MS
  const firstTouch = (walking: boolean) => {
    let soonest = Infinity
    now.wanderers.forEach((it, i) => {
      const was = before.wanderers[i]!
      const drift = { x: (it.x - was.x) / steps, z: (it.z - was.z) / steps }
      for (let k = 0; k <= DODGE_HORIZON_STEPS && k < soonest; k++) {
        const mine = walking ? { x: me.x + heading.x * WALK_STRIDE * k, z: me.z + heading.z * WALK_STRIDE * k } : me
        if (Math.abs(mine.x - (it.x + drift.x * k)) < WANDERER_TOUCH && Math.abs(mine.z - (it.z + drift.z * k)) < WANDERER_TOUCH) soonest = k
      }
    })
    return soonest
  }
  return firstTouch(true) >= firstTouch(false)
}

// The sighting to judge drift from: the latest at least LOOK_BACK_MS old.
export function sightingBefore(sightings: Sighting[], now: number): Sighting | undefined {
  return [...sightings].reverse().find((s) => now - s.at >= LOOK_BACK_MS)
}
