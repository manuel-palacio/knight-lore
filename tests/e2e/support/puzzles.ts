import { expect, type Page } from '@playwright/test'
import { entryFor, oppositeOf, type Direction, type RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, give, holdDaylight, putDown as putDownCharm, walkPath, walkUntil } from './game'
import { dangersOf, type Step } from './roomPath'

// The puzzle rooms (some door cannot be reached on foot: tools/rip/castle.py
// marks them), each with its solution played by tests/e2e/puzzles.spec.ts:
// no other room may have a door out of reach.
export const SOLVED_PUZZLES = ['map--5-4', 'map-5-6', 'map-7-1', 'map--1--3', 'map--5--8', 'map--4--5', 'map--1-1'] as const

// The room as the jump planner should see it once charms lie in it.
export function withCharms(room: RoomSpec, cells: Step[]): RoomSpec {
  return { ...room, id: `${room.id} with charms at ${JSON.stringify(cells)}`, pickups: cells.map((c) => ({ x: c.x, z: c.z, item: 'gem', y: c.y + 0.4 })) }
}

export async function enterBy(page: Page, room: RoomSpec, door: Direction, charms = 0): Promise<void> {
  await enterRoom(page, room.id, entryFor(oppositeOf(door), room.width ?? 8, room.depth ?? 8))
  await holdDaylight(page)
  if (charms) await give(page, Array.from({ length: charms }, () => 'gem'))
}

// Only standing: having just walked off a charm, he may still be dropping to the floor.
export async function putDown(page: Page): Promise<void> {
  await expect.poll(async () => (await debug(page)).state).toBe('grounded')
  const { pos } = await debug(page)
  await putDownCharm(page)
  expect((await debug(page)).pos.y).toBe(pos.y + 1)
}

export async function leaveBy(page: Page, room: RoomSpec, door: Direction): Promise<void> {
  const target = room.exits.find((e) => e.direction === door)!.target
  if ((await debug(page)).room === target) return
  await face(page, door)
  await walkUntil(page, (s) => s.room === target)
}

export async function walk(page: Page, room: RoomSpec, path: Step[]): Promise<void> {
  await walkPath(page, path, dangersOf(room))
}

