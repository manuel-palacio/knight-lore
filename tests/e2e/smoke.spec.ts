import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'

// End-to-end smoke: the game loads, starts, lets you walk between rooms, and
// runs the cure loop once. Dev hooks (__dbg, __room, __pos) only exist under
// `vite` dev, which is what the webServer runs.

// Doorways sit on the middle tile of an edge: tile 4 of 8, two units wide.
const SOUTH_DOOR_X = 8.8

interface Debug {
  room: string
  facing: string
  pos: { x: number; y: number; z: number }
  wanted: string | null
  carrying: string | null
  delivered: number
  pickups: { id: string; x: number; y: number; z: number }[]
  cauldron: { x: number; y: number; z: number } | null
}

function debug(page: Page): Promise<Debug> {
  return page.evaluate(() => (window as unknown as { __dbg: () => Debug }).__dbg())
}

async function startGame(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.locator('#intro')).toBeVisible()
  await page.waitForFunction(() => '__dbg' in window)
  await page.keyboard.press('Enter')
  await expect(page.locator('#intro')).toBeHidden()
}

async function enterRoom(page: Page, id: string): Promise<Debug> {
  await page.evaluate((room) => (window as unknown as { __room: (r: string) => void }).__room(room), id)
  await expect.poll(async () => (await debug(page)).room).toBe(id)
  return debug(page)
}

async function standAt(page: Page, at: { x: number; y: number; z: number }): Promise<void> {
  await page.evaluate(
    ({ x, y, z }) => (window as unknown as { __pos: (x: number, y: number, z: number) => void }).__pos(x, y, z),
    at,
  )
}

async function face(page: Page, facing: string): Promise<void> {
  for (let turns = 0; turns < 4 && (await debug(page)).facing !== facing; turns++) {
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(150)
  }
  expect((await debug(page)).facing).toBe(facing)
}

async function walkUntil(page: Page, arrived: (state: Debug) => boolean): Promise<void> {
  await page.keyboard.down('ArrowUp')
  await expect.poll(async () => arrived(await debug(page)), { timeout: 10_000, intervals: [20] }).toBe(true)
  await page.keyboard.up('ArrowUp')
}

function roomHolding(item: string): string {
  const spec = ROOM_SPECS.find((s) => s.pickups?.some((p) => p.item === item))
  if (!spec) throw new Error(`no room holds ${item}`)
  return spec.id
}

test('title screen shows and a key starts the game', async ({ page }) => {
  await startGame(page)
  const state = await debug(page)
  expect(state.room).toBe('map--4-4')
  expect(state.wanted).not.toBeNull()
})

test('walking forward through the south door enters the next room', async ({ page }) => {
  await startGame(page)
  await face(page, 'east')
  await walkUntil(page, (state) => state.pos.x >= SOUTH_DOOR_X)
  await face(page, 'south')
  await walkUntil(page, (state) => state.room === 'map--4-5')
})

test('the wanted charm can be picked up and delivered to the cauldron', async ({ page }) => {
  await startGame(page)
  const { wanted } = await debug(page)
  if (!wanted) throw new Error('nothing wanted at start')

  const charmRoom = await enterRoom(page, roomHolding(wanted))
  const charm = charmRoom.pickups.find((p) => p.id === wanted)
  if (!charm) throw new Error(`${wanted} not in ${charmRoom.room}`)
  await standAt(page, charm)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toBe(wanted)

  const cauldronRoom = await enterRoom(page, 'room-001')
  if (!cauldronRoom.cauldron) throw new Error('no cauldron in room-001')
  await standAt(page, { ...cauldronRoom.cauldron, z: cauldronRoom.cauldron.z + 1.2 })
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).delivered).toBe(1)
  const after = await debug(page)
  expect(after.carrying).toBeNull()
  expect(after.wanted).not.toBe(wanted)
})
