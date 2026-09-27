import { test, expect } from '@playwright/test'
import { debug, enterRoom, face, holdDaylight, startGame, standAt } from './support/game'

// Sabreman and the wolf drawn from the original's sprites, a screenshot per
// facing and form for review against the original (see #7).

for (const form of ['human', 'werewolf'] as const) {
  test(`the ${form === 'human' ? 'man' : 'wolf'} in all four facings`, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 850 })
    await startGame(page)
    await enterRoom(page, 'map--4--4')
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

// Now and then he glances aside (0xCDDA, see HeadTurn): with every random
// byte below 2 he glances one way, and the second way with every byte 0xFE or more.
for (const [byte, cells] of [[0.001, [4, 7]], [0.999, [8, 11]]] as const) {
  test(`he is drawn glancing with the random byte at ${byte * 256 < 2 ? 'the bottom' : 'the top'}`, async ({ page }) => {
    await page.addInitScript((value) => { Math.random = () => value }, byte)
    await startGame(page)
    await enterRoom(page, 'map--4--4')
    await holdDaylight(page)
    await expect.poll(async () => (await debug(page)).frame.frame).toBeGreaterThanOrEqual(cells[0])
    expect((await debug(page)).frame.frame).toBeLessThanOrEqual(cells[1])
  })
}
