import { test, expect } from '@playwright/test'
import { debug, enterRoom, face, holdDaylight } from './support/game'
import { containsRun, openTitle, recorded, titleOpening } from './support/audio'

// The original's tunes, when the browser lets the page make sound at once
// (a site the player has used before).
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })
test('the title tune plays as soon as the title screen shows', async ({ page }) => {
  await openTitle(page)
  await expect.poll(async () => (await recorded(page)).played.slice(0, 6)).toEqual(titleOpening)
  await expect(page.locator('#sound-hint')).toBeHidden()
})

test('the title tune plays again when Sabreman loses his last life', async ({ page }) => {
  test.setTimeout(60_000)
  await openTitle(page)
  await page.keyboard.press('Enter')
  await enterRoom(page, 'map--4-5')
  await holdDaylight(page)
  await face(page, 'south')
  const before = (await recorded(page)).played.length
  await page.keyboard.down('ArrowUp')
  await expect.poll(async () => (await debug(page)).lives, { timeout: 45_000 }).toBe(0)
  await page.keyboard.up('ArrowUp')
  await expect.poll(async () => containsRun((await recorded(page)).played.slice(before), titleOpening)).toBe(true)
})
