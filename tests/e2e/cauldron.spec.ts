import { test, expect } from '@playwright/test'
import { CAULDRON_TAKE_OFF, debug, enterRoom, give, holdDaylight, jumpOntoCauldron, putDown, standAt, startGame } from './support/game'

// Melkhior's room is no place for the wolf: the sparkle over the cauldron
// turns on him the moment he is in the room, and is faster than he is.
// By day the room is safe for the man.

async function nightfall(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(0.05))
  await expect.poll(async () => (await debug(page)).form, { timeout: 5_000 }).toBe('werewolf')
}

test('the wolf left standing in the cauldron room loses a life', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'room-001')
  await nightfall(page)
  await standAt(page, { x: 3, y: 0, z: 13 })
  await expect.poll(async () => (await debug(page)).lives, { timeout: 10_000 }).toBeLessThan(5)
})

test('the wolf coming into the cauldron room is caught within a second and a half', async ({ page }) => {
  await startGame(page)
  await nightfall(page)
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(9_999))
  await enterRoom(page, 'room-001')
  await standAt(page, { x: 3, y: 0, z: 13 })
  await expect.poll(async () => (await debug(page)).lives, { timeout: 1_500 }).toBeLessThan(5)
})

test('the man can stand in the cauldron room all day', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'room-001')
  await standAt(page, { x: 3, y: 0, z: 13 })
  await page.waitForTimeout(3_000)
  expect((await debug(page)).lives).toBe(5)
})

// A charm goes into the cauldron put down from up on it (0xC0C6): a held jump
// from the floor gets him up there, two blocks high.
test('a held jump from the floor lands him up on the cauldron, where the wanted charm put down goes in', async ({ page }) => {
  await startGame(page)
  const { wanted } = await debug(page)
  await give(page, [wanted!])
  const room = await enterRoom(page, 'room-001')
  await holdDaylight(page)
  const cauldron = room.cauldron!
  await standAt(page, { x: cauldron.x + CAULDRON_TAKE_OFF.dx, y: 0, z: cauldron.z + CAULDRON_TAKE_OFF.dz })
  await jumpOntoCauldron(page)
  await putDown(page)
  await expect.poll(async () => (await debug(page)).delivering).toBe(true)
  await expect.poll(async () => (await debug(page)).delivered, { timeout: 10_000 }).toBe(1)
})

test('a wrong charm put into the cauldron is lost for good', async ({ page }) => {
  await startGame(page)
  const { wanted } = await debug(page)
  const wrong = ['gem', 'boot'].find((c) => c !== wanted)!
  await give(page, [wrong])
  await enterRoom(page, 'room-001')
  await holdDaylight(page)
  const { cauldron } = await debug(page)
  await standAt(page, { x: cauldron!.x - 0.5, y: 2, z: cauldron!.z - 0.5 })
  await putDown(page)
  await expect.poll(async () => (await debug(page)).delivering, { timeout: 10_000 }).toBe(false)
  const after = await debug(page)
  expect(after.delivered).toBe(0)
  expect(after.carrying).toEqual([])
  expect(after.pickups.map((p) => p.id)).not.toContain(wrong)
})
