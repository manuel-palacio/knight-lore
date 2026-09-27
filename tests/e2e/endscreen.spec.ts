import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, startGame } from './support/game'

// The original's end screen after a loss and after a win (see EndSummary):
// days, quest done, charms, rating, and a win first has the potion verse.

async function visitTwoMoreRooms(page: Page): Promise<void> {
  const start = (await debug(page)).room
  const here = ROOM_SPECS.find((s) => s.id === start)!
  await enterRoom(page, here.exits[0]!.target)
  const next = ROOM_SPECS.find((s) => s.id === here.exits[0]!.target)!
  await enterRoom(page, next.exits.find((e) => e.target !== here.id)?.target ?? here.id)
}

// Three rooms visited, no charms: (3 × 0xA41A + 0x28) / 65536 is 1%.
const SUMMARY_OF_THREE_ROOMS = ['GAME OVER', 'TIME 1 DAYS', 'PERCENTAGE OF QUEST COMPLETED 1%', 'CHARMS COLLECTED 0']

test('game over shows the summary: days, quest done, charms and a rating', async ({ page }) => {
  await startGame(page)
  await visitTwoMoreRooms(page)
  await page.evaluate(() => (window as unknown as { __lose: () => void }).__lose())
  const screen = page.locator('#gameover')
  await expect(screen).toBeVisible()
  for (const line of [...SUMMARY_OF_THREE_ROOMS, 'OVERALL RATING POOR']) await expect(screen).toContainText(line)
})

test('a win shows the potion verse, then the summary rated four places up', async ({ page }) => {
  await startGame(page)
  await visitTwoMoreRooms(page)
  await page.evaluate(() => (window as unknown as { __win: () => void }).__win())
  const screen = page.locator('#win')
  await expect(screen).toBeVisible()
  for (const line of ['THE POTION CASTS', 'GO FORTH TO MIREMARE', ...SUMMARY_OF_THREE_ROOMS, 'OVERALL RATING EXCELLENT']) await expect(screen).toContainText(line)
})
