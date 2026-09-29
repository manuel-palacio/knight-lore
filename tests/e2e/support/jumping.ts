import { Player, type PlayerCtx } from '../../../src/game/Player'
import { GameState } from '../../../src/game/GameState'
import { Spike } from '../../../src/game/SpikeGrid'
import { Flame } from '../../../src/game/Flame'
import { blockFillsAt } from '../../../src/game/BlockSolids'
import { SpikedBall } from '../../../src/game/SpikedBall'
import { FallingBlock } from '../../../src/game/FallingBlock'
import { PIXELS_PER_BLOCK } from '../../../src/game/Gravity'
import { touchesHazard } from '../../../src/game/Hazards'
import { SIMULATION_DT } from '../../../src/engine/GameLoop'
import { buildRoomFromSpec } from '../../../src/scenes/rooms/specBuilder'
import type { Room } from '../../../src/game/Room'
import type { RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import type { Step } from './roomPath'

// Where to take off from, and whether to hold Space, for a jump from one
// cell of a path to the next (up onto a block, or over a spike row). Found
// by jumping the game's own Player in a copy of the room built from its
// spec: a tapped jump rises a block and carries about two and a half units,
// a held one rises two and a third and carries about five, and a block's
// face stops him until he is above it, so the take-off point matters.
export interface FallingTop {
  x: number
  z: number
  top: number
}

export interface JumpPlan {
  at: { x: number; z: number }
  held: boolean
}

const TILE = 2
const NUDGES = [0, -0.25, 0.25, -0.5, 0.5, -0.75, -1, -1.25, -1.5, -1.75]
// Past the middle of the take-off cell he would be in the next one.
const RUN_UP_IN_THIS_CELL = -0.75
const MAX_TICKS = 600

const rooms = new Map<string, Promise<Room>>()

// Whether a jump from where he actually stands lands (tapped first, then
// held): he may stop a step short of or past the planned take-off, on a
// falling block that has sunk under him (`sunk`: their tops as they are now).
export async function jumpFrom(spec: RoomSpec, path: Step[], into: number, at: { x: number; y: number; z: number }, sunk: FallingTop[] = []): Promise<boolean | undefined> {
  const room = await roomOf(spec)
  syncFalling(room, sunk)
  const from = path[into - 1]!
  const to = path[into]!
  const along = { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) }
  return [false, true].find((held) => lands(room, at, along, held, to))
}

// Prefers a take-off from which the jump still lands if he stops a step
// short or long of it, or a couple of pixels lower (on a block sinking
// under him); `sunk` gives falling blocks' tops as they are now.
export async function planJump(spec: RoomSpec, path: Step[], into: number, sunk: FallingTop[] = []): Promise<JumpPlan> {
  const room = await roomOf(spec)
  const from = path[into - 1]!
  const to = path[into]!
  const along = { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) }
  const nudges = NUDGES.filter((n) => n >= RUN_UP_IN_THIS_CELL || runUpBehind(path, into))
  const y = standingOn(room, from, sunk)
  const jumpsFrom = (nudge: number, held: boolean, drop = 0) =>
    lands(room, { x: centre(from.x) + along.x * nudge, y: y - drop, z: centre(from.z) + along.z * nudge }, along, held, to)
  const robust = (nudge: number, held: boolean) =>
    jumpsFrom(nudge, held) && jumpsFrom(nudge - STEP_SLOP, held) && jumpsFrom(nudge + STEP_SLOP, held) && jumpsFrom(nudge, held, SINK_SLOP)
  for (const pick of [robust, (n: number, h: boolean) => jumpsFrom(n, h)]) {
    for (const nudge of nudges) {
      for (const held of [false, true]) {
        if (pick(nudge, held)) return { at: { x: centre(from.x) + along.x * nudge, z: centre(from.z) + along.z * nudge }, held }
      }
    }
  }
  throw new Error(`${spec.id}: no jump lands from ${from.x},${from.z} on ${to.x},${to.z}`)
}

const STEP_SLOP = 0.25
const SINK_SLOP = 2 / PIXELS_PER_BLOCK

// Where he stands in a cell of the path: its height, or a falling block's
// top as it is now.
function standingOn(room: Room, cell: Step, sunk: FallingTop[]): number {
  syncFalling(room, sunk)
  const block = room.entities.find((e): e is FallingBlock => e instanceof FallingBlock && e.position.x === centre(cell.x) && e.position.z === centre(cell.z))
  return block && Math.abs(block.top - cell.y) < 1 ? block.top : cell.y
}

function syncFalling(room: Room, sunk: FallingTop[]): void {
  for (const block of room.entities) {
    if (!(block instanceof FallingBlock)) continue
    block.reset()
    const now = sunk.find((b) => b.x === block.position.x && b.z === block.position.z)
    if (now) block.topPx = Math.round(now.top * PIXELS_PER_BLOCK)
  }
}

// True when the cell behind the take-off, in line and as high, is on the path: room for a run-up.
function runUpBehind(path: Step[], into: number): boolean {
  const before = path[into - 2]
  const from = path[into - 1]!
  const to = path[into]!
  if (!before || before.y !== from.y) return false
  return Math.sign(from.x - before.x) === Math.sign(to.x - from.x) && Math.sign(from.z - before.z) === Math.sign(to.z - from.z)
}

function lands(room: Room, start: { x: number; y: number; z: number }, along: { x: number; z: number }, held: boolean, to: Step): boolean {
  const player = new Player()
  player.position.set(start.x, start.y, start.z)
  player.facing = along.x > 0 ? 'east' : along.x < 0 ? 'west' : along.z > 0 ? 'south' : 'north'
  const hazards = room.entities.filter((e) => e instanceof Spike || e instanceof Flame || (e instanceof SpikedBall))
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    player.update(SIMULATION_DT, contextFor(room, player, tick === 0, held))
    if (hazards.some((h) => touchesHazard(player, h))) return false
    if (tick > 0 && player.state === 'grounded') return overCell(player, to) && Math.abs(player.position.y - to.y) < 1e-6
  }
  return false
}

// Any of his body over the cell: he stands on an edge as well as in the middle (see Player).
function overCell(player: Player, cell: Step): boolean {
  const half = player.extents.x / 2
  const inside = (at: number, c: number) => at + half > c * TILE && at - half < (c + 1) * TILE
  return inside(player.position.x, cell.x) && inside(player.position.z, cell.z)
}

function contextFor(room: Room, player: Player, pressed: boolean, held: boolean): PlayerCtx {
  return {
    grid: room.grid,
    state: new GameState(),
    tileSize: room.tileSize,
    input: { isDown: (code) => code === 'Space' && held, wasPressed: (code) => code === 'Space' && pressed },
    dynamicSupport: (x, z, y) => supportAmong(room, player, x, z, y),
    dynamicSolid: (x, z, from, to) => blockFillsAt(room.entities, x, z, from, to),
    onLanded: () => {},
    onJumped: () => {},
  }
}

function supportAmong(room: Room, player: Player, x: number, z: number, y: number): number | null {
  let best: number | null = null
  for (const e of room.entities) {
    if (e === player || !('supportAt' in e)) continue
    const top = (e as unknown as { supportAt: (x: number, z: number, y: number) => number | null }).supportAt(x, z, y)
    if (top !== null && (best === null || top > best)) best = top
  }
  return best
}

// The room's shape: the charms dealt to its spots are not stood on to get to them.
function roomOf(spec: RoomSpec): Promise<Room> {
  if (!rooms.has(spec.id)) rooms.set(spec.id, buildRoomFromSpec({ ...spec, charmSpots: [] })(new GameState()))
  return rooms.get(spec.id)!
}

function centre(cell: number): number {
  return cell * TILE + TILE / 2
}
