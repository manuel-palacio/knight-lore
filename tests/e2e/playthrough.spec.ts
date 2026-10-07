import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS, oppositeOf, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { CHARM_HOVER } from '../../src/game/Pickup'
import { CHARMS } from '../../src/game/GameState'
import { dealtCharms, debug, face, jumpOntoCauldron, putDown, startGame, walkPath, walkUntil, type Cell, type Debug } from './support/game'
import { dangersOf, doorOf, exitOf, findFloorPath } from './support/roomPath'

// A whole game played with the keyboard alone, on the real day clock: fetch
// each charm the cauldron asks for, carry it back, wait out the night when
// needed, until the cure is brewed. Slow (minutes), so it runs on demand:
//   npm run test:playthrough

const CAULDRON_ROOM = 'room-001'
// The take-off south of the cauldron (see CAULDRON_TAKE_OFF).
const BESIDE_CAULDRON: Cell = { x: 4, z: 5 }
const MAX_ATTEMPTS_PER_LEG = 4
// Seconds of daylight the cauldron room needs (the wolf is hunted there the
// moment he is in it): walk in, jump up onto the cauldron, put the charm down
// (up to three presses) and stand while it sinks. Days are 49 s.
const DAYLIGHT_TO_DELIVER = 11
// Start rooms whose way to the cauldron needs a charm to stand on (a raised
// doorway), or deals with a kind of charm only up high (the cure wants each
// kind twice): the bot, on foot, starts another game.
const NEW_GAMES_FOR_A_WALKABLE_START = 20

test.skip(!process.env.PLAYTHROUGH, 'set PLAYTHROUGH=1 to play a whole game')

test('the game can be won from the start room with the keyboard', async ({ page }) => {
  test.setTimeout(60 * 60_000)
  const started = Date.now()
  await startGame(page)
  let whereabouts = await walkableWhereabouts(page)
  for (let game = 1; !reachesCauldron((await debug(page)).room) || !CHARMS.every((c) => (whereabouts.get(c)?.length ?? 0) >= 2); game++) {
    if (game >= NEW_GAMES_FOR_A_WALKABLE_START) throw new Error('no game whose start and charms the bot can walk to')
    await startGame(page)
    whereabouts = await walkableWhereabouts(page)
  }

  for (let leg = 0; leg < 2_000; leg++) {
    const state = await debug(page)
    console.log(`leg ${leg} day ${state.day} ${state.form} lives ${state.lives} in ${state.room} carrying ${state.carrying} wants ${state.wanted} (${state.delivered} delivered)`)
    if (state.won) break
    expect(state.lives, 'ran out of lives').toBeGreaterThan(0)
    const wanted = state.wanted!
    // The wolf carries as the man does, but the cauldron room is death to
    // him: at night he leaves it, and goes on with his errand elsewhere.
    if (state.night && state.room === CAULDRON_ROOM) {
      await retrying(page, () => stepToward(page, safeNeighbourOf(state.room)))
      continue
    }
    if (state.carrying.includes(wanted)) {
      if (state.room === CAULDRON_ROOM) await deliver(page)
      else await retrying(page, () => stepToward(page, CAULDRON_ROOM))
      const after = await debug(page)
      if (!after.carrying.includes(wanted) && after.delivered === state.delivered) {
        const droppedIn = after.pickups.some((p) => p.id === wanted) ? after.room : state.room
        whereabouts.get(wanted)!.push(droppedIn)
      }
      continue
    }
    const onFloorHere = state.pickups.find((p) => p.id === wanted)
    if (onFloorHere) {
      await retrying(page, () => pickUp(page, onFloorHere))
      const rooms = whereabouts.get(wanted)!
      rooms.splice(rooms.indexOf(state.room), 1)
      continue
    }
    await retrying(page, () => stepToward(page, nearest(state.room, cellOf(state), whereabouts.get(wanted)!)))
  }

  const end = await debug(page)
  console.log(`won on day ${end.day} with ${end.lives} lives in ${Math.round((Date.now() - started) / 1000)}s`)
  expect(end.won).toBe(true)
})

// Where each kind lies this game, as dealt round the castle's spots; those
// high up (reached only by stepping on other charms) are left to a player.
async function walkableWhereabouts(page: Page): Promise<Map<string, string[]>> {
  const whereabouts = new Map<string, string[]>()
  for (const c of await dealtCharms(page)) {
    if (onFoot(c)) whereabouts.set(c.item, [...(whereabouts.get(c.item) ?? []), c.room])
  }
  return whereabouts
}

async function retrying(page: Page, leg: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await leg()
    } catch (err) {
      const s = await debug(page)
      console.log(`attempt ${attempt} failed in ${s.room} at ${s.pos.x},${s.pos.y},${s.pos.z} facing ${s.facing}, ${s.state}, ${s.form}, timer ${s.timer.toFixed(1)}: ${String(err).split('\n')[0]}`)
      if (attempt >= MAX_ATTEMPTS_PER_LEG) throw err
    }
  }
}

async function stepToward(page: Page, goal: string): Promise<void> {
  const state = await debug(page)
  let exit = nextExit(state.room, cellOf(state), goal)
  // Into the cauldron room only with daylight enough to deliver: the wolf is
  // hunted there the moment he is in it. He waits for the morning outside a
  // room ghosts or hopping balls wander, never in one.
  if (exit.target === CAULDRON_ROOM && (state.night || state.timer < DAYLIGHT_TO_DELIVER)) {
    if (noPlaceToLinger(state.room)) exit = nextExit(state.room, cellOf(state), safeNeighbourOf(state.room))
    else if (state.night) await waitForDaylight(page)
    else await waitForNextMorning(page)
    if (exit.target === CAULDRON_ROOM) return
  }
  const spec = specOf(state.room)
  await walkPath(page, findFloorPath(spec, cellOf(state), exitOf(spec, exit.direction)), dangersOf(spec))
  await face(page, exit.direction)
  await walkUntil(page, (s) => s.room === exit.target)
  // A sparkle cloud (map-6--3, map--3--1, map--8-6) makes for him and is
  // stepped round, which the bot cannot do. It does no harm, so it is taken
  // out of the room: the game is still won or lost on everything that can.
  if (specOf(exit.target).followers) await page.evaluate(() => (window as unknown as { __noFollowers: () => void }).__noFollowers())
}

// Night falls whenever it likes: in the cauldron room the errand is given up
// and the main loop walks him out; elsewhere the wolf goes on.
async function nightfallStopsErrand(page: Page): Promise<boolean> {
  const state = await debug(page)
  return state.night && state.room === CAULDRON_ROOM
}

async function pickUp(page: Page, charm: { id: string; x: number; y: number; z: number }): Promise<void> {
  if (await nightfallStopsErrand(page)) return
  const state = await debug(page)
  const target = { x: Math.floor(charm.x / 2), z: Math.floor(charm.z / 2), y: Math.round(charm.y - CHARM_HOVER) }
  await walkPath(page, findFloorPath(specOf(state.room), cellOf(state), target), dangersOf(specOf(state.room)))
  if (await nightfallStopsErrand(page)) return
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toContain(charm.id)
}

// Up onto the cauldron with a held jump from the floor south of it, and the
// charm put down there goes in.
async function deliver(page: Page): Promise<void> {
  const state = await debug(page)
  await walkPath(page, findFloorPath(specOf(state.room), cellOf(state), BESIDE_CAULDRON), dangersOf(specOf(state.room)))
  if (await nightfallStopsErrand(page)) return
  await jumpOntoCauldron(page)
  await putDown(page)
  await expect.poll(async () => (await debug(page)).delivered, { timeout: 10_000 }).toBe(state.delivered + 1)
}

async function waitForNextMorning(page: Page): Promise<void> {
  await expect.poll(async () => (await debug(page)).night, { timeout: 30_000, intervals: [250] }).toBe(true)
  await waitForDaylight(page)
}

async function waitForDaylight(page: Page): Promise<void> {
  await expect.poll(async () => (await debug(page)).night, { timeout: 60_000, intervals: [250] }).toBe(false)
  await expect.poll(async () => (await debug(page)).form, { timeout: 5_000, intervals: [100] }).toBe('human')
  await expect.poll(async () => (await debug(page)).state, { timeout: 5_000 }).toBe('grounded')
}

function cellOf(state: Debug): Cell {
  const spec = specOf(state.room)
  const clamp = (v: number, cells: number) => Math.min(cells - 1, Math.max(0, Math.floor(v / 2)))
  return { x: clamp(state.pos.x, spec.width ?? 8), z: clamp(state.pos.z, spec.depth ?? 8) }
}

// A charm spot the bot can walk to from each door of its room.
function onFoot(charm: { room: string; spot: number }): boolean {
  const room = specOf(charm.room)
  const spot = room.charmSpots!.find((c) => c.spot === charm.spot)!
  const cell = { x: Math.floor(spot.x), z: Math.floor(spot.z), y: spot.height }
  return room.exits.every((e) => {
    try {
      findFloorPath(room, doorOf(room, e.direction), cell)
      return true
    } catch {
      return false
    }
  })
}

function specOf(id: string): RoomSpec {
  const spec = ROOM_SPECS.find((s) => s.id === id)
  if (!spec) throw new Error(`no spec ${id}`)
  return spec
}

function noPlaceToLinger(roomId: string): boolean {
  return Boolean(specOf(roomId).cauldron) || wandered(roomId)
}

function safeNeighbourOf(roomId: string): string {
  const safe = specOf(roomId).exits.find((e) => !noPlaceToLinger(e.target))
  return (safe ?? specOf(roomId).exits[0]!).target
}

function reachesCauldron(start: string): boolean {
  try {
    roomsBetween(start, doorOf(specOf(start), specOf(start).exits[0]!.direction), CAULDRON_ROOM)
    return true
  } catch {
    return false
  }
}

function nearest(from: string, at: Cell, rooms: string[]): string {
  const distance = (to: string) => {
    try {
      return roomsBetween(from, at, to)
    } catch {
      return Infinity
    }
  }
  const ranked = [...rooms].filter((r) => distance(r) < Infinity).sort((a, b) => distance(a) - distance(b))
  if (!ranked[0]) throw new Error(`nowhere left to look from ${from}`)
  return ranked[0]
}

// Routes go only through crossings the walker can make on foot: from where
// he stands in this room to one of its doors, then door to door. Puzzle
// crossings (a charm to stand on, a block to push) are left for people.
const walkable = new Map<string, boolean>()

function canWalk(roomId: string, from: Cell, to: Cell): boolean {
  const cacheKey = `${roomId}:${from.x},${from.z}>${to.x},${to.z}`
  if (!walkable.has(cacheKey)) {
    try {
      findFloorPath(specOf(roomId), from, to)
      walkable.set(cacheKey, true)
    } catch {
      walkable.set(cacheKey, false)
    }
  }
  return walkable.get(cacheKey)!
}

interface Leg {
  exit: RoomSpec['exits'][number]
  rooms: number
}

// Ghosts and hopping balls may cost a life whenever their room is crossed:
// one counts as this many rooms of walking, so a short way round is taken.
const WANDERED_ROOM_COST = 4

// The cheapest way on foot, counting rooms: the first door to take.
function route(from: string, at: Cell, goal: string): Leg {
  const firstExit = new Map<string, RoomSpec['exits'][number]>()
  const cost = new Map<string, number>()
  const queue: { id: string; entry: Cell; key: string }[] = []
  const reach = (state: { id: string; entry: Cell; key: string }, exit: RoomSpec['exits'][number], total: number) => {
    if (cost.has(state.key) && cost.get(state.key)! <= total) return
    cost.set(state.key, total)
    firstExit.set(state.key, exit)
    queue.push(state)
  }
  for (const e of specOf(from).exits) {
    if (canWalk(from, at, exitOf(specOf(from), e.direction))) reach(arrive(e), e, costOfEntering(e.target))
  }
  while (queue.length > 0) {
    queue.sort((a, b) => cost.get(a.key)! - cost.get(b.key)!)
    const { id, entry, key } = queue.shift()!
    if (id === goal) return { exit: firstExit.get(key)!, rooms: cost.get(key)! }
    for (const e of specOf(id).exits) {
      if (canWalk(id, entry, exitOf(specOf(id), e.direction))) reach(arrive(e), firstExit.get(key)!, cost.get(key)! + costOfEntering(e.target))
    }
  }
  throw new Error(`no route on foot ${from} -> ${goal}`)
}

function costOfEntering(roomId: string): number {
  return wandered(roomId) ? WANDERED_ROOM_COST : 1
}

function wandered(roomId: string): boolean {
  const spec = specOf(roomId)
  return (spec.ghosts?.length ?? 0) + (spec.hoppers?.length ?? 0) > 0
}

function arrive(e: RoomSpec['exits'][number]): { id: string; entry: Cell; key: string } {
  const target = specOf(e.target)
  const entry = doorOf(target, oppositeOf(e.direction))
  return { id: e.target, entry, key: `${e.target}@${entry.x},${entry.z}` }
}

function roomsBetween(from: string, at: Cell, to: string): number {
  return from === to ? 0 : route(from, at, to).rooms
}

function nextExit(from: string, at: Cell, goal: string): RoomSpec['exits'][number] {
  return route(from, at, goal).exit
}
