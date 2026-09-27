import { test, expect } from '@playwright/test'
import { debug, enterRoom, holdDaylight, standAt, startGame } from './support/game'

// A moving block sways half a cell either side of where it stands (0xB6B1,
// 0xB6B9), and goes through the original's collision routine, which checks it
// against Sabreman too (0xCB45, 0xCB9A): it waits while he is in its way,
// does not push him, and moves on once he is clear.

// map--4--3: the block of column 1 sways along z between cells 3.5 and 4.5
// (world z 8 to 10); he stands in cell (1,5), where its far end reaches.
const IN_ITS_WAY = { x: 3, y: 0, z: 11 }
const CLEARANCE = 1 + 0.4
const FAR_END = 10

const blockOfColumnOne = async (page: import('@playwright/test').Page) => (await debug(page)).platforms.find((p) => p.x === 3)!

test('a moving block sways only half a cell either side of where it stands', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map--4--3')
  await holdDaylight(page)
  const seen = new Set<number>()
  const deadline = Date.now() + 4_000
  while (Date.now() < deadline) {
    seen.add((await blockOfColumnOne(page)).z)
    await page.waitForTimeout(40)
  }
  expect(Math.min(...seen)).toBeGreaterThanOrEqual(8)
  expect(Math.max(...seen)).toBeLessThanOrEqual(FAR_END)
  expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(1.5)
})

test('a moving block stops at Sabreman instead of passing through him, and goes on once he steps away', async ({ page }) => {
  test.setTimeout(60_000)
  await startGame(page)
  await enterRoom(page, 'map--4--3')
  await holdDaylight(page)
  await standAt(page, IN_ITS_WAY)
  const lives = (await debug(page)).lives
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    const { pos } = await debug(page)
    expect(pos).toEqual(IN_ITS_WAY)
    expect(IN_ITS_WAY.z - (await blockOfColumnOne(page)).z).toBeGreaterThanOrEqual(CLEARANCE - 0.01)
    await page.waitForTimeout(40)
  }
  expect((await debug(page)).lives).toBe(lives)
  await standAt(page, { x: 7, y: 0, z: 11 })
  await expect.poll(async () => (await blockOfColumnOne(page)).z, { timeout: 5_000, intervals: [20] }).toBeGreaterThan(IN_ITS_WAY.z - CLEARANCE)
})
