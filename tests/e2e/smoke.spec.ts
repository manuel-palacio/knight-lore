import { test, expect } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, standAt, startGame, walkUntil } from './support/game'

// End-to-end smoke: the game loads, starts, lets you walk between rooms, and
// runs the cure loop once.

// Doorways sit on the middle tile of an edge: tile 4 of 8, two units wide.
const SOUTH_DOOR_X = 8.8

function roomHolding(item: string): string {
  const spec = ROOM_SPECS.find((s) => s.pickups?.some((p) => p.item === item))
  if (!spec) throw new Error(`no room holds ${item}`)
  return spec.id
}

test('title screen shows and a key starts the game', async ({ page }) => {
  await startGame(page)
  const state = await debug(page)
  expect(state.room).toBe('map--4-4')
  expect(state.wanted).not.toBeNull()
})

test('walking forward through the south door enters the next room', async ({ page }) => {
  await startGame(page)
  await face(page, 'east')
  await walkUntil(page, (state) => state.pos.x >= SOUTH_DOOR_X)
  await face(page, 'south')
  await walkUntil(page, (state) => state.room === 'map--4-5')
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
