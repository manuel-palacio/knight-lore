import { test, expect } from '@playwright/test'
import { ROOM_SPECS, START_ROOMS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, standAt, startGame, walkPath, walkUntil } from './support/game'
import { doorOf, findFloorPath } from './support/roomPath'

// End-to-end smoke: the game loads, starts, lets you walk between rooms, and
// runs the cure loop once.

function roomHolding(item: string): string {
  const spec = ROOM_SPECS.find((s) => s.pickups?.some((p) => p.item === item))
  if (!spec) throw new Error(`no room holds ${item}`)
  return spec.id
}

test('title screen shows and a key starts the game', async ({ page }) => {
  await startGame(page)
  const state = await debug(page)
  expect(START_ROOMS).toContain(state.room)
  expect(state.wanted).not.toBeNull()
})

test('walking out through a door of the start room enters the next room', async ({ page }) => {
  await startGame(page)
  const startRoom = (await debug(page)).room
  const spec = ROOM_SPECS.find((s) => s.id === startRoom)!
  const exit = spec.exits[0]!
  const here = (await debug(page)).pos
  await walkPath(page, findFloorPath(spec, { x: Math.floor(here.x / 2), z: Math.floor(here.z / 2) }, doorOf(spec, exit.direction)))
  await face(page, exit.direction)
  await walkUntil(page, (state) => state.room === exit.target)
})

test('the wanted charm can be picked up and delivered to the cauldron', async ({ page }) => {
  await startGame(page)
  const { wanted } = await debug(page)
  if (!wanted) throw new Error('nothing wanted at start')

  const charmRoom = await enterRoom(page, roomHolding(wanted))
  const charm = charmRoom.pickups.find((p) => p.id === wanted)
  if (!charm) throw new Error(`${wanted} not in ${charmRoom.room}`)
  await standAt(page, charm)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toBe(wanted)

  const cauldronRoom = await enterRoom(page, 'room-001')
  if (!cauldronRoom.cauldron) throw new Error('no cauldron in room-001')
  await standAt(page, { ...cauldronRoom.cauldron, z: cauldronRoom.cauldron.z + 1.2 })
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).delivered).toBe(1)
  expect((await debug(page)).carrying).toBeNull()
})
