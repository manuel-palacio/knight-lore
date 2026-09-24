import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { debug, face, startGame, walkPath, walkUntil, type Cell, type Debug } from './support/game'
import { DOOR_CELL, findFloorPath } from './support/roomPath'

// A whole game played with the keyboard alone, on the real day clock: fetch
// each charm the cauldron asks for, carry it back, wait out the night when
// needed, until the cure is brewed. Slow (minutes), so it runs on demand:
//   npm run test:playthrough

const CAULDRON_ROOM = 'room-001'
const BESIDE_CAULDRON: Cell = { x: 4, z: 5 }
const DELIVERY_REACH = 1.6
const MAX_ATTEMPTS_PER_LEG = 4
// Seconds of daylight a crossing needs, with the seizure to spare: a room
// takes three to five seconds to walk, turns included.
const DAYLIGHT_TO_CROSS = 12
const DAYLIGHT_TO_DELIVER = 20

test.skip(!process.env.PLAYTHROUGH, 'set PLAYTHROUGH=1 to play a whole game')

test('the game can be won from the start room with the keyboard', async ({ page }) => {
  test.setTimeout(40 * 60_000)
  const started = Date.now()
  await startGame(page)
  const whereabouts = new Map<string, string[]>()
  for (const spec of ROOM_SPECS) for (const p of spec.pickups ?? []) whereabouts.set(p.item, [...(whereabouts.get(p.item) ?? []), spec.id])

  for (let leg = 0; leg < 2_000; leg++) {
    const state = await debug(page)
    console.log(`leg ${leg} day ${state.day} ${state.form} lives ${state.lives} in ${state.room} carrying ${state.carrying} wants ${state.wanted} (${state.delivered} delivered)`)
    if (state.won) break
    expect(state.lives, 'ran out of lives').toBeGreaterThan(0)
    const wanted = state.wanted!
    if (state.form === 'werewolf' && hauntedAtNight(state.room)) {
      await retrying(() => stepToward(page, safeNeighbourOf(state.room)))
      continue
    }
    if (state.carrying === wanted) {
      if (state.room === CAULDRON_ROOM) await deliver(page)
      else await retrying(() => stepToward(page, CAULDRON_ROOM))
      const after = await debug(page)
      if (after.carrying === null && after.delivered === state.delivered) {
        const droppedIn = after.pickups.some((p) => p.id === wanted) ? after.room : state.room
        whereabouts.get(wanted)!.push(droppedIn)
      }
      continue
    }
    const onFloorHere = state.pickups.find((p) => p.id === wanted)
    if (onFloorHere) {
      await retrying(() => pickUp(page, onFloorHere))
      const rooms = whereabouts.get(wanted)!
      rooms.splice(rooms.indexOf(state.room), 1)
      continue
    }
    await retrying(() => stepToward(page, nearest(state.room, whereabouts.get(wanted)!)))
  }

  const end = await debug(page)
  console.log(`won on day ${end.day} with ${end.lives} lives in ${Math.round((Date.now() - started) / 1000)}s`)
  expect(end.won).toBe(true)
})

async function retrying(leg: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await leg()
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS_PER_LEG) throw err
    }
  }
}

async function stepToward(page: Page, goal: string): Promise<void> {
  const state = await debug(page)
  let exit = nextExit(state.room, goal)
  // Ghosts, and the spirit in the cauldron, hunt only the wolf: at night he
  // waits for the morning outside their rooms, never in one.
  if (state.form === 'werewolf' && hauntedAtNight(exit.target)) {
    if (hauntedAtNight(state.room)) exit = nextExit(state.room, safeNeighbourOf(state.room))
    else await waitForDaylight(page)
  } else if (hauntedAtNight(exit.target) && !hauntedAtNight(state.room) && state.timer < daylightNeededIn(exit.target)) {
    await waitForNextMorning(page)
  }
  const spec = specOf(state.room)
  await walkPath(page, findFloorPath(spec, cellOf(state), DOOR_CELL[exit.direction]))
  await face(page, exit.direction)
  await walkUntil(page, (s) => s.room === exit.target)
}

// Night falls whenever it likes. Where a wolf would be hunted, give up the
// errand and let the main loop walk him out; elsewhere, wait for the morning.
async function nightfallStopsErrand(page: Page): Promise<boolean> {
  const state = await debug(page)
  if (state.form === 'human') return false
  if (hauntedAtNight(state.room)) return true
  await waitForDaylight(page)
  return false
}

async function pickUp(page: Page, charm: { id: string; x: number; z: number }): Promise<void> {
  if (await nightfallStopsErrand(page)) return
  const state = await debug(page)
  const target = { x: Math.floor(charm.x / 2), z: Math.floor(charm.z / 2) }
  await walkPath(page, findFloorPath(specOf(state.room), cellOf(state), target))
  if (await nightfallStopsErrand(page)) return
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toBe(charm.id)
}

async function deliver(page: Page): Promise<void> {
  const state = await debug(page)
  const cauldron = state.cauldron!
  await walkPath(page, findFloorPath(specOf(state.room), cellOf(state), BESIDE_CAULDRON))
  await face(page, 'north')
  await walkUntil(page, (s) => s.pos.z <= cauldron.z + DELIVERY_REACH)
  if (await nightfallStopsErrand(page)) return
  const delivered = state.delivered
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).delivered).toBe(delivered + 1)
}

async function waitForNextMorning(page: Page): Promise<void> {
  await expect.poll(async () => (await debug(page)).form, { timeout: 30_000, intervals: [250] }).toBe('werewolf')
  await waitForDaylight(page)
}

async function waitForDaylight(page: Page): Promise<void> {
  await expect.poll(async () => (await debug(page)).form, { timeout: 60_000, intervals: [250] }).toBe('human')
  await expect.poll(async () => (await debug(page)).state, { timeout: 5_000 }).toBe('grounded')
}

function cellOf(state: Debug): Cell {
  const clamp = (v: number) => Math.min(7, Math.max(0, Math.floor(v / 2)))
  return { x: clamp(state.pos.x), z: clamp(state.pos.z) }
}

function specOf(id: string): RoomSpec {
  const spec = ROOM_SPECS.find((s) => s.id === id)
  if (!spec) throw new Error(`no spec ${id}`)
  return spec
}

function daylightNeededIn(roomId: string): number {
  return roomId === CAULDRON_ROOM ? DAYLIGHT_TO_DELIVER : DAYLIGHT_TO_CROSS
}

function hauntedAtNight(roomId: string): boolean {
  const spec = specOf(roomId)
  return Boolean(spec.cauldron) || (spec.ghosts?.length ?? 0) > 0
}

function safeNeighbourOf(roomId: string): string {
  const safe = specOf(roomId).exits.find((e) => !hauntedAtNight(e.target))
  return (safe ?? specOf(roomId).exits[0]!).target
}

function nearest(from: string, rooms: string[]): string {
  const ranked = [...rooms].sort((a, b) => roomsBetween(from, a) - roomsBetween(from, b))
  if (!ranked[0]) throw new Error(`nowhere left to look from ${from}`)
  return ranked[0]
}

function roomsBetween(from: string, to: string): number {
  const distance = new Map([[from, 0]])
  const queue = [from]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (id === to) return distance.get(id)!
    for (const e of specOf(id).exits) {
      if (distance.has(e.target)) continue
      distance.set(e.target, distance.get(id)! + 1)
      queue.push(e.target)
    }
  }
  throw new Error(`no route ${from} -> ${to}`)
}

function nextExit(from: string, goal: string): RoomSpec['exits'][number] {
  const firstStep = new Map<string, RoomSpec['exits'][number]>()
  const queue = specOf(from).exits.map((e) => {
    firstStep.set(e.target, e)
    return e.target
  })
  while (queue.length > 0) {
    const id = queue.shift()!
    if (id === goal) return firstStep.get(id)!
    for (const e of specOf(id).exits) {
      if (firstStep.has(e.target) || e.target === from) continue
      firstStep.set(e.target, firstStep.get(id)!)
      queue.push(e.target)
    }
  }
  throw new Error(`no route ${from} -> ${goal}`)
}
