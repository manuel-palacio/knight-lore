import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'

const CHARM_HOVER = 0.4
import { debug, enterRoom, give, holdDaylight, roomHolding, standAt, startGame } from './support/game'

async function pickUpCharmIn(page: Page, roomId: string): Promise<string> {
  const room = await enterRoom(page, roomId)
  await holdDaylight(page)
  const charm = room.pickups[0]
  if (!charm) throw new Error(`no charm in ${roomId}`)
  await standAt(page, { ...charm, y: charm.y - CHARM_HOVER }) // on the ground the charm hovers over
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([charm.id])
  return charm.id
}

async function fallNight(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __timer: (s: number) => void }).__timer(0.05))
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
}

test('a charm dropped at nightfall stays in the room where it fell', async ({ page }) => {
  await startGame(page)
  const charmRoomId = await roomHolding(page, (item) => item !== 'life')
  const charmRoom = ROOM_SPECS.find((s) => s.id === charmRoomId)!
  const charm = await pickUpCharmIn(page, charmRoom.id)
  const elsewhere = charmRoom.exits[0]!.target

  await enterRoom(page, elsewhere)
  await fallNight(page)
  await expect.poll(async () => (await debug(page)).carrying).toEqual([])
  expect((await debug(page)).pickups.map((p) => p.id)).toContain(charm)

  await enterRoom(page, charmRoom.id)
  expect((await debug(page)).pickups.map((p) => p.id)).not.toContain(charm)
})

test('the extra life is taken at once, not carried, and does not come back', async ({ page }) => {
  await startGame(page)
  const lifeRoomId = await roomHolding(page, (item) => item === 'life')
  const lifeRoom = ROOM_SPECS.find((s) => s.id === lifeRoomId)!
  const room = await enterRoom(page, lifeRoom.id)
  await holdDaylight(page)
  const life = room.pickups.find((p) => p.id === 'life')!
  await standAt(page, life)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).lives).toBe(6)
  expect((await debug(page)).carrying).toEqual([])

  await enterRoom(page, lifeRoom.exits[0]!.target)
  const back = await enterRoom(page, lifeRoom.id)
  expect(back.pickups.map((p) => p.id)).not.toContain('life')
})

test('E puts the carried charm down under his feet, and he stands on it a block higher', async ({ page }) => {
  await startGame(page)
  const charm = await pickUpCharmIn(page, await roomHolding(page, (item) => item !== 'life'))
  const before = (await debug(page)).pos
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([])
  const after = await debug(page)
  expect(after.pos.y).toBe(before.y + 1)
  expect(after.state).toBe('grounded')
  const dropped = after.pickups.find((p) => p.id === charm)!
  expect(dropped.x).toBe(before.x)
  expect(dropped.z).toBe(before.z)
})

test('jumping off a charm he put down, E takes it back up in mid-air', async ({ page }) => {
  await startGame(page)
  // In the open middle of a start room, nothing overhead for the jump to meet.
  await enterRoom(page, 'map--4--4', { x: 8, z: 8 })
  await holdDaylight(page)
  const charm = 'gem'
  await give(page, [charm])
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([])
  const onCharm = (await debug(page)).pos.y
  await page.keyboard.down('Space')
  await expect.poll(async () => (await debug(page)).pos.y, { intervals: [10] }).toBeGreaterThan(onCharm + 1)
  await page.keyboard.press('KeyE')
  await page.keyboard.up('Space')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([charm])
})
