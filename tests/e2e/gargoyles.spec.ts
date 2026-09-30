import { test, expect } from '@playwright/test'
import { debug, enterRoom, face, holdDaylight, standAt, startGame, tileCentre } from './support/game'

// A gargoyle (type 4, handler 0xB7A3) kills at a touch (0xB85C), man or wolf:
// walking into one, or standing on one.

test('walking into a gargoyle costs a life', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map-6-7')
  await holdDaylight(page)
  // The floor-level gargoyle on (3,3), approached from the cell west of it.
  await standAt(page, { x: tileCentre(2), y: 0, z: tileCentre(3) })
  await face(page, 'east')
  await page.keyboard.down('ArrowUp')
  // Let go at the first life lost: held on, he walks on from the door into the room's spikes.
  await expect.poll(async () => (await debug(page)).lives, { timeout: 5_000, intervals: [20] }).toBeLessThan(5)
  await page.keyboard.up('ArrowUp')
})

test('standing on a gargoyle costs a life', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map--1-1')
  await holdDaylight(page)
  await standAt(page, { x: tileCentre(2), y: 2, z: tileCentre(4) })
  await expect.poll(async () => (await debug(page)).lives, { timeout: 5_000 }).toBe(4)
})
