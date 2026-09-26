import { test, expect } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, standAt, startGame, tileCentre, walkPath, walkUntil } from './support/game'
import { doorOf, findFloorPath } from './support/roomPath'

// The gate across the corridor map--1--2 (the original's room 0x67): it
// rests shut, rises, waits, and drops.
const GATED = 'map--1--2'
const spec = ROOM_SPECS.find((s) => s.id === GATED)!
const GATE_ROW = spec.portcullises![0]!.from.z
const DOOR_AXIS_X = tileCentre(doorOf(spec, 'south').x)

test('the corridor cannot be crossed while the gate is shut, and can once it has risen', async ({ page }) => {
  test.setTimeout(90_000)
  await startGame(page)
  await enterRoom(page, GATED)
  await holdDaylight(page)
  await face(page, 'south')
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1_500)
  const held = await debug(page)
  await page.keyboard.up('ArrowUp')
  expect(held.gates[0]!.state).toBe('shut')
  expect(held.pos.z).toBeLessThan(GATE_ROW * 2)

  await walkPath(page, findFloorPath(spec, doorOf(spec, 'north'), doorOf(spec, 'south')))
  await face(page, 'south')
  await walkUntil(page, (s) => s.room === 'map--1--1')
  expect((await debug(page)).lives).toBe(5)
})

test('a falling gate costs a life if Sabreman is under it', async ({ page }) => {
  test.setTimeout(90_000)
  await startGame(page)
  await enterRoom(page, GATED)
  await holdDaylight(page)
  await expect.poll(async () => (await debug(page)).gates[0]!.state, { timeout: 30_000, intervals: [50] }).toBe('open')
  await page.waitForTimeout(2_500) // the grace after entering the room runs out
  await standAt(page, { x: DOOR_AXIS_X, y: 0, z: GATE_ROW * 2 + 1 })
  await expect.poll(async () => (await debug(page)).lives, { timeout: 15_000 }).toBe(4)
})
