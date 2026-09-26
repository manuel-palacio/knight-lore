import { test, expect } from '@playwright/test'
import { debug, enterRoom, face, holdDaylight, startGame, standAt } from './support/game'

// Sabreman and the wolf drawn from the original's sprites, a screenshot per
// facing and form for review against the original (see #7).

for (const form of ['human', 'werewolf'] as const) {
  test(`the ${form === 'human' ? 'man' : 'wolf'} in all four facings`, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 850 })
    await startGame(page)
    await enterRoom(page, 'map--4-4')
    await holdDaylight(page)
    if (form === 'werewolf') {
      await page.evaluate(() => (window as unknown as { __t: () => void }).__t())
      await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
    }
    await standAt(page, { x: 8, y: 0, z: 8 })
    for (const facing of ['east', 'south', 'west', 'north']) {
      await face(page, facing)
      await page.waitForTimeout(150)
      await page.locator('canvas').first().screenshot({ path: `test-results/characters/${form}-${facing}.png` })
    }
  })
}

test('the title screen shows Sabreman standing', async ({ page }) => {
  await page.goto('/')
  await page.locator('#intro .hero').screenshot({ path: 'test-results/characters/title-hero.png' })
})
