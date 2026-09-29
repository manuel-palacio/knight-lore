import { test, expect } from '@playwright/test'
import { debug, enterRoom, holdDaylight, startGame } from './support/game'

// The sparkle cloud of the room table's t25 (handler 0xB92C) makes for him
// wherever he stands, and does him no harm.
test('the sparkle cloud in map-6--3 comes at him, and touching him costs nothing', async ({ page }) => {
  await startGame(page)
  const room = await enterRoom(page, 'map-6--3')
  await holdDaylight(page)
  const distance = (s: typeof room) => Math.hypot(s.followers[0]!.x - s.pos.x, s.followers[0]!.z - s.pos.z)
  const before = distance(room)
  await expect.poll(async () => distance(await debug(page)), { timeout: 5_000 }).toBeLessThan(Math.min(before, 2))
  await page.waitForTimeout(1_000)
  expect((await debug(page)).lives).toBe(5)
})
