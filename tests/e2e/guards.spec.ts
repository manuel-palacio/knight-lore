import { test, expect } from '@playwright/test'
import { debug, enterRoom, holdDaylight, standAt, startGame } from './support/game'

// A guard walks the whole route its handler takes (tools/rip/castle.py),
// past the doorways as in the original, not a cell or two of it.

const CELL = 2

test('the guard of map-0--1 walks its route all round the room, not back and forth on one cell', async ({ page }) => {
  test.setTimeout(60_000)
  await startGame(page)
  await enterRoom(page, 'map-0--1')
  await holdDaylight(page)
  // Out of its way, in cell (1,6), which is neither on its route nor a spike.
  await standAt(page, { x: 3, y: 0, z: 13 })
  const lives = (await debug(page)).lives
  const seen = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const guard = (await debug(page)).monsters.find((m) => m.kind === 'patrols')!
    seen.minX = Math.min(seen.minX, guard.x)
    seen.maxX = Math.max(seen.maxX, guard.x)
    seen.minZ = Math.min(seen.minZ, guard.z)
    seen.maxZ = Math.max(seen.maxZ, guard.z)
    await page.waitForTimeout(100)
  }
  expect((await debug(page)).lives).toBe(lives)
  // A cell a second (two pixels a frame of the original's): in 20 s it has
  // gone from (4,2) down to row 4, over to column 7, up to row 0 and across.
  expect(seen.maxX - seen.minX).toBeGreaterThanOrEqual(4 * CELL)
  expect(seen.maxZ - seen.minZ).toBeGreaterThanOrEqual(4 * CELL)
})
