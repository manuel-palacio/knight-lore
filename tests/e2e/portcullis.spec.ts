import { test, expect } from '@playwright/test'
import { debug, enterRoom, face, holdDaylight, standAt, startGame, tileCentre, walkPath, walkUntil } from './support/game'
import { dangersOf, doorOf, findFloorPath } from './support/roomPath'
import { specById } from './support/specs'

// The gate across the corridor map--1--2 (the original's room 0x67): it
// rests shut, rises, waits, and drops. A guard paces the row past it.
const GATED = 'map--1--2'
const spec = specById(GATED)
const GATE_ROW = spec.portcullises![0]!.from.z
const DOOR_AXIS_X = tileCentre(doorOf(spec, 'south').x)
const GRILLE_Z = tileCentre(GATE_ROW)

test('the corridor cannot be crossed while the gate is shut, and can once it has risen', async ({ page }) => {
  test.setTimeout(90_000)
  await startGame(page)
  await enterRoom(page, GATED)
  await holdDaylight(page)
  await expect.poll(async () => (await debug(page)).gates[0]!.state, { timeout: 30_000, intervals: [20] }).toBe('shut')
  await face(page, 'south')
  await page.keyboard.down('ArrowUp')
  // Walking on until he stops, while the gate is still down: at the grille.
  let last = -1
  const held = await expect
    .poll(async () => {
      const now = await debug(page)
      const stopped = Math.abs(now.pos.z - last) < 1e-6
      last = now.pos.z
      return stopped && now.gates[0]!.state === 'shut'
    }, { timeout: 10_000, intervals: [150] })
    .toBe(true)
    .then(() => debug(page))
  await page.keyboard.up('ArrowUp')
  // Held short of the grille, which runs across the middle of its row.
  expect(held.pos.z).toBeLessThan(GRILLE_Z)

  await walkPath(page, findFloorPath(spec, doorOf(spec, 'north'), doorOf(spec, 'south')), dangersOf(spec))
  await face(page, 'south')
  const beyond = spec.exits.find((e) => e.direction === 'south')!.target
  await walkUntil(page, (s) => s.room === beyond)
  expect((await debug(page)).lives).toBe(5)
})

test('a falling gate costs a life if Sabreman is under it', async ({ page }) => {
  test.setTimeout(90_000)
  await startGame(page)
  await enterRoom(page, GATED)
  await holdDaylight(page)
  await expect.poll(async () => (await debug(page)).gates[0]!.state, { timeout: 30_000, intervals: [50] }).toBe('open')
  await standAt(page, { x: DOOR_AXIS_X, y: 0, z: GATE_ROW * 2 + 1 })
  await expect.poll(async () => (await debug(page)).lives, { timeout: 15_000 }).toBe(4)
})
