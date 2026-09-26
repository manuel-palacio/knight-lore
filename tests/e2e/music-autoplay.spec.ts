import { test, expect } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, holdDaylight, standAt, tileCentre } from './support/game'
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
  test.setTimeout(90_000)
  const spiked = ROOM_SPECS.find((s) => (s.spikes ?? []).some((c) => !c.height))!
  const spike = spiked.spikes!.find((c) => !c.height)!
  await openTitle(page)
  await page.keyboard.press('Enter')
  await enterRoom(page, spiked.id)
  await holdDaylight(page)
  const before = (await recorded(page)).played.length
  while ((await debug(page)).lives > 0) {
    const lives = (await debug(page)).lives
    await page.waitForTimeout(2_500) // the grace after entering or dying runs out
    await standAt(page, { x: tileCentre(spike.x), y: 0, z: tileCentre(spike.z) })
    await expect.poll(async () => (await debug(page)).lives).toBeLessThan(lives)
  }
  await expect.poll(async () => containsRun((await recorded(page)).played.slice(before), titleOpening)).toBe(true)
})
