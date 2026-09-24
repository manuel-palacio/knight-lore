import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, holdDaylight, standAt, startGame } from './support/game'

async function pickUpCharmIn(page: Page, roomId: string): Promise<string> {
  const room = await enterRoom(page, roomId)
  await holdDaylight(page)
  const charm = room.pickups[0]
  if (!charm) throw new Error(`no charm in ${roomId}`)
  await standAt(page, charm)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toBe(charm.id)
  return charm.id
}

async function fallNight(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(0.05))
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
}

test('a charm dropped at nightfall stays in the room where it fell', async ({ page }) => {
  await startGame(page)
  const charmRoom = ROOM_SPECS.find((s) => s.pickups?.length)!
  const charm = await pickUpCharmIn(page, charmRoom.id)
  const elsewhere = charmRoom.exits[0]!.target

  await enterRoom(page, elsewhere)
  await fallNight(page)
  await expect.poll(async () => (await debug(page)).carrying).toBeNull()
  expect((await debug(page)).pickups.map((p) => p.id)).toContain(charm)

  await enterRoom(page, charmRoom.id)
  expect((await debug(page)).pickups.map((p) => p.id)).not.toContain(charm)
})
