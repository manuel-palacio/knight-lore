import { test, expect, type Page } from '@playwright/test'
import { debug, enterRoom, face, give, holdDaylight, startGame } from './support/game'
import { ROOM_SPECS, entryFor } from '../../src/scenes/rooms/roomSpecs'

// Things that happen at unusual moments: behind the title screen, at
// nightfall in mid-jump, in the seizure, on continuing a saved game.
const SAVE_KEY = 'knight-lore.save'
type Hooks = { __t: () => void; __timer: (s: number) => void; __lose: () => void; __dbg: () => { timer: number } }

async function openTitle(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
}

test('nothing happens behind the title screen: the day does not pass', async ({ page }) => {
  await openTitle(page)
  const before = await page.evaluate(() => (window as unknown as Hooks).__dbg().timer)
  await page.waitForTimeout(1_000)
  expect(await page.evaluate(() => (window as unknown as Hooks).__dbg().timer)).toBe(before)
})

test('the key that begins the game is not also a jump', async ({ page }) => {
  await openTitle(page)
  await page.keyboard.press('Space')
  await page.waitForTimeout(300)
  expect((await debug(page)).pos.y).toBe(0)
})

test('the saved game is gone once the game is over', async ({ page }) => {
  await startGame(page)
  await page.evaluate((key) => localStorage.setItem(key, '{"stale":true}'), SAVE_KEY)
  await page.evaluate(() => (window as unknown as Hooks).__lose())
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull()
})

// A save written by this version: the game's own, taken at a door.
async function saveFrom(page: Page, change: (save: Record<string, unknown>) => void): Promise<Record<string, unknown>> {
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY)
  if (!save) throw new Error('no save yet')
  change(save)
  return save
}

async function walkThroughADoor(page: Page): Promise<void> {
  await enterRoom(page, 'map--4--4', { x: 8, z: 3 })
  await holdDaylight(page)
  await face(page, 'north')
  await page.keyboard.down('ArrowUp')
  await expect.poll(async () => (await debug(page)).room, { timeout: 10_000 }).not.toBe('map--4--4')
  await page.keyboard.up('ArrowUp')
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
}

test('a game saved at night goes on as the wolf, drawn as the wolf', async ({ page }) => {
  await startGame(page)
  await walkThroughADoor(page)
  const save = await saveFrom(page, (s) => { s.form = 'werewolf'; s.transformTimer = 30 })
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, JSON.stringify(save)] as const)
  await openTitle(page)
  await page.keyboard.press('KeyC')
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
})

test('a continued game puts him back where he came into the room, facing the same way', async ({ page }) => {
  await startGame(page)
  await walkThroughADoor(page)
  const save = await saveFrom(page, () => {})
  const entry = save.entry as { x: number; z: number; facing: string }
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, JSON.stringify(save)] as const)
  await openTitle(page)
  await page.keyboard.press('KeyC')
  await expect.poll(async () => (await debug(page)).room).toBe(save.currentRoomId)
  const back = await debug(page)
  expect([back.pos.x, back.pos.z, back.facing]).toEqual([entry.x, entry.z, entry.facing])
})

test('coming into map--4--2 from the south, he stands on the block beside the doorway, not half inside it', async ({ page }) => {
  const room = ROOM_SPECS.find((r) => r.id === 'map--4--2')!
  await startGame(page)
  await enterRoom(page, room.id, entryFor('north', room.width ?? 8, room.depth ?? 8))
  await expect.poll(async () => (await debug(page)).pos.y).toBe(1)
})

test('night does not fall on him in mid-jump: it waits until he is down', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map--4--4', { x: 8, z: 8 })
  await holdDaylight(page)
  await page.waitForTimeout(300)
  await page.keyboard.down('Space')
  await expect.poll(async () => (await debug(page)).state, { intervals: [10] }).toBe('jumping')
  await page.evaluate(() => (window as unknown as Hooks).__timer(0.01))
  await page.keyboard.up('Space')
  for (let s = await debug(page); s.state !== 'grounded'; s = await debug(page)) expect(s.night).toBe(false)
  await expect.poll(async () => (await debug(page)).night).toBe(true)
})

test('at nightfall the charms he carries go under his feet one on another, not all in one place', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map--4--4', { x: 8, z: 8 })
  await holdDaylight(page)
  await give(page, ['gem', 'boot'])
  await page.evaluate(() => (window as unknown as Hooks).__timer(0.01))
  await expect.poll(async () => (await debug(page)).pickups.map((p) => p.y).sort()).toEqual([0.4, 1.4])
})

test('E does nothing while he is in the seizure', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map--4--4', { x: 8, z: 8 })
  await holdDaylight(page)
  await give(page, ['gem'])
  await page.evaluate(() => (window as unknown as Hooks).__t())
  await page.keyboard.press('KeyE')
  await page.waitForTimeout(200)
  expect((await debug(page)).carrying).toEqual(['gem'])
})
