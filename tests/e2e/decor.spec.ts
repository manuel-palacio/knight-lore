import { test, expect } from '@playwright/test'
import { enterRoom, holdDaylight, startGame } from './support/game'

// A garden room of hedges and a hall of gargoyles, drawn with the original's
// own sprites (tools/rip/objects.py), not the plain block: rooms where
// nothing moves, so each picture is the same every time.
const PLAY_AREA = { x: 256, y: 64, width: 768, height: 392 }

for (const [id, what] of [['map-6--3', 'hedges'], ['map--1-1', 'gargoyles']] as const) {
  test(`${id} is drawn with its ${what}`, async ({ page }) => {
    await startGame(page)
    await enterRoom(page, id)
    await holdDaylight(page)
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot(`${id}-${what}.png`, { clip: PLAY_AREA, maxDiffPixelRatio: 0.002 })
  })
}
