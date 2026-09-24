import { test, expect } from '@playwright/test'
import { debug, face, startGame } from './support/game'

// The transformation is a seizure: Sabreman cannot move while it plays out
// (about two seconds), and once it is over he is the wolf.

test('Sabreman cannot walk while the transformation plays', async ({ page }) => {
  await startGame(page)
  await face(page, 'south')
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(0.05))
  await page.waitForTimeout(150)
  const before = (await debug(page)).pos
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1_000)
  const during = (await debug(page)).pos
  await page.keyboard.up('ArrowUp')
  expect(during).toEqual(before)
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
})
