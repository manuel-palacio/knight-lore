import { test, expect } from '@playwright/test'
import { containsRun, openTitle, recorded, startOpening, titleOpening } from './support/audio'

// The original's tunes, when the browser holds sound back until the page has
// had a click or a key: the default for a first visit. Headless Chromium does
// not apply that policy, so the recorder imposes it (support/audio.ts).
test('the title screen offers sound, and a click plays the title tune', async ({ page }) => {
  await openTitle(page, true)
  await expect(page.locator('#sound-hint')).toBeVisible()
  expect((await recorded(page)).played).toEqual([])
  await page.mouse.click(10, 10)
  await expect(page.locator('#sound-hint')).toBeHidden()
  await expect(page.locator('#intro')).toBeVisible()
  await expect.poll(async () => (await recorded(page)).played.slice(0, 6)).toEqual(titleOpening)
})

test('a key cuts the title tune short and starts the game with the start tune', async ({ page }) => {
  await openTitle(page, true)
  await page.mouse.click(10, 10)
  await expect.poll(async () => (await recorded(page)).played.length).toBeGreaterThan(0)
  await page.keyboard.press('Enter')
  await expect(page.locator('#intro')).toBeHidden()
  await expect.poll(async () => (await recorded(page)).cut).toBeGreaterThan(0)
  await expect.poll(async () => containsRun((await recorded(page)).played, startOpening)).toBe(true)
})

test('a key alone starts the game with the start tune', async ({ page }) => {
  await openTitle(page, true)
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await recorded(page)).played.slice(0, 4)).toEqual(startOpening)
})
