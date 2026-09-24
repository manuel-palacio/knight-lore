import { test, expect } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, standAt, startGame } from './support/game'

// The transformation is a seizure: Sabreman cannot move while it plays out
// (about two seconds), drops what he carries, and comes out of it the wolf.

test('morphing while carrying freezes Sabreman and drops the charm', async ({ page }) => {
  await startGame(page)
  const charmRoom = ROOM_SPECS.find((s) => s.pickups?.some((p) => p.item !== 'life'))!
  const room = await enterRoom(page, charmRoom.id)
  await holdDaylight(page)
  const charm = room.pickups[0]!
  await standAt(page, charm)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toBe(charm.id)
  await face(page, 'south')

  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(0.05))
  await page.waitForTimeout(150)
  expect((await debug(page)).carrying).toBeNull()
  const before = (await debug(page)).pos
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1_000)
  const during = (await debug(page)).pos
  await page.keyboard.up('ArrowUp')
  expect(during).toEqual(before)
  expect((await debug(page)).pickups.map((p) => p.id)).toContain(charm.id)
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
})
