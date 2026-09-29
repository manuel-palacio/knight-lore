import { test, expect } from '@playwright/test'
import { debug, enterRoom, face, give, holdDaylight, roomHolding, standAt, startGame } from './support/game'

// The transformation is a seizure: Sabreman cannot move while it plays out
// (about two seconds), drops what he carries, and comes out of it the wolf.

test('morphing while carrying freezes Sabreman and drops the charm', async ({ page }) => {
  await startGame(page)
  const room = await enterRoom(page, await roomHolding(page, (item) => item !== 'life'))
  await holdDaylight(page)
  const charm = room.pickups[0]!
  await standAt(page, charm)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([charm.id])
  await face(page, 'south')

  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(0.05))
  await page.waitForTimeout(150)
  expect((await debug(page)).carrying).toEqual([])
  const before = (await debug(page)).pos
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1_000)
  const during = (await debug(page)).pos
  await page.keyboard.up('ArrowUp')
  expect(during).toEqual(before)
  expect((await debug(page)).pickups.map((p) => p.id)).toContain(charm.id)
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
})

test('a charm the wolf drops in mid-jump falls to the floor, not left hanging in the air', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map--4--4', { x: 8, z: 8 })
  await holdDaylight(page)
  await give(page, ['gem'])
  await page.keyboard.down('Space')
  await expect.poll(async () => (await debug(page)).pos.y, { intervals: [10] }).toBeGreaterThan(1.5)
  // Nightfall now, in the air: the wolf cannot carry.
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(0.01))
  await page.keyboard.up('Space')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([])
  await expect.poll(async () => (await debug(page)).pickups.find((p) => p.id === 'gem')?.y, { timeout: 5_000 }).toBeCloseTo(0.4, 5)
})
