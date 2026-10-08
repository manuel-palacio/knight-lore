import { test, expect } from '@playwright/test'
import { CAULDRON_TAKE_OFF, debug, enterRoom, face, give, holdDaylight, jumpOntoCauldron, putDown, standAt, startGame } from './support/game'
import { entryFor } from '../../src/scenes/rooms/roomSpecs'

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

test('the wolf staying in the cauldron room is caught once the sparkle has risen', async ({ page }) => {
  await startGame(page)
  await nightfall(page)
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(9_999))
  await enterRoom(page, 'room-001')
  await standAt(page, { x: 3, y: 0, z: 13 })
  await expect.poll(async () => (await debug(page)).lives, { timeout: 3_000 }).toBeLessThan(5)
})

// The sparkle rises sixteen frames before it looks at him (0xB8EE): the wolf
// who comes in by a door and goes straight back out is gone before it turns,
// and so after a death, when he comes back at that door.
test('the wolf who goes straight back out by the door he came in by gets away', async ({ page }) => {
  await startGame(page)
  await nightfall(page)
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(9_999))
  const room = await enterRoom(page, 'room-001', entryFor('north', 8, 8))
  // Come in northward by the south door: straight back out of it.
  await face(page, 'south')
  await page.keyboard.down('ArrowUp')
  await expect.poll(async () => (await debug(page)).room, { timeout: 5_000 }).not.toBe(room.room)
  await page.keyboard.up('ArrowUp')
  expect((await debug(page)).lives).toBe(5)
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

// Caught there, he comes back at the door he came in by, and the sparkle,
// set up again with the room, rises afresh: he gets away, one life the less,
// not killed over and over.
test('the wolf caught in the cauldron room comes back at the door and gets away, not killed over and over', async ({ page }) => {
  await startGame(page)
  await nightfall(page)
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(9_999))
  const room = await enterRoom(page, 'room-001', entryFor('north', 8, 8))
  await expect.poll(async () => (await debug(page)).lives, { timeout: 5_000 }).toBe(4)
  await expect.poll(async () => (await debug(page)).dying, { timeout: 5_000 }).toBe(false)
  await face(page, 'south')
  await page.keyboard.down('ArrowUp')
  await expect.poll(async () => (await debug(page)).room, { timeout: 5_000 }).not.toBe(room.room)
  await page.keyboard.up('ArrowUp')
  expect((await debug(page)).lives).toBe(4)
})
