import { test, expect } from '@playwright/test'
import { debug, enterRoom, standAt, startGame } from './support/game'

// Melkhior's room is no place for the wolf: a spirit rises from the cauldron
// at night. By day the room is safe.

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

test('the man can stand in the cauldron room all day', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'room-001')
  await standAt(page, { x: 3, y: 0, z: 13 })
  await page.waitForTimeout(3_000)
  expect((await debug(page)).lives).toBe(5)
})
