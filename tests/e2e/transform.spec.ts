import { test, expect, type Page } from '@playwright/test'
import { debug, enterRoom, face, holdDaylight, roomHolding, standAt, startGame } from './support/game'

// The transformation is a seizure: Sabreman cannot move while it plays out
// (about two seconds), and comes out of it the wolf. What he carries stays
// in his hands: the wolf carries charms as the man does (both forms' handlers
// call the original's pick-up, 0xC00E, and nothing else touches what he holds).

const setTimer = (page: Page, seconds: number) => page.evaluate((s) => (window as unknown as { __timer: (s: number) => void }).__timer(s), seconds)

test('morphing while carrying freezes Sabreman, and the wolf still has the charm', async ({ page }) => {
  await startGame(page)
  const room = await enterRoom(page, await roomHolding(page, (item) => item !== 'life'))
  await holdDaylight(page)
  const charm = room.pickups[0]!
  await standAt(page, charm)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([charm.id])
  await face(page, 'south')

  await setTimer(page, 0.05)
  await page.waitForTimeout(150)
  const before = (await debug(page)).pos
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1_000)
  const during = (await debug(page)).pos
  await page.keyboard.up('ArrowUp')
  expect(during).toEqual(before)
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
  expect((await debug(page)).carrying).toEqual([charm.id])
  expect((await debug(page)).pickups.map((p) => p.id)).not.toContain(charm.id)
})

test('the wolf picks up a charm and puts it down again', async ({ page }) => {
  await startGame(page)
  const room = await enterRoom(page, await roomHolding(page, (item) => item !== 'life'))
  await setTimer(page, 0.05)
  await expect.poll(async () => (await debug(page)).form, { timeout: 5_000 }).toBe('werewolf')
  await setTimer(page, 9_999)
  const charm = room.pickups[0]!
  await standAt(page, charm)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([charm.id])

  // Put down where there is room over his head for it.
  await enterRoom(page, 'map--4--4', { x: 8, z: 8 })
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([])
  expect((await debug(page)).pickups.map((p) => p.id)).toContain(charm.id)
})
