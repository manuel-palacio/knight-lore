import { test, expect } from '@playwright/test'
import { enterRoom, holdDaylight, startGame } from './support/game'

// A garden room of hedges and a hall of gargoyles, drawn with the original's
// own sprites (tools/rip/objects.py), not the plain block: rooms where
// nothing moves, so each picture is the same every time (the random numbers
// pinned: the charm dealt to map-6--3's spot is the same each time too).
const PLAY_AREA = { x: 256, y: 64, width: 768, height: 392 }

for (const [id, what] of [['map-6--3', 'hedges'], ['map--1-1', 'gargoyles']] as const) {
  test(`${id} is drawn with its ${what}`, async ({ page }) => {
    await page.addInitScript(() => { Math.random = () => 0.5 })
    await startGame(page)
    await enterRoom(page, id)
    await holdDaylight(page)
    // map-6--3's sparkle cloud makes for him: out of the picture.
    await page.evaluate(() => (window as unknown as { __noFollowers: () => void }).__noFollowers())
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot(`${id}-${what}.png`, { clip: PLAY_AREA, maxDiffPixelRatio: 0.002 })
  })
}
