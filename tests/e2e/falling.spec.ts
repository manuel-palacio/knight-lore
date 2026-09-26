import { test, expect } from '@playwright/test'
import { ROOM_SPECS, type Cell } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, holdDaylight, standAt, startGame, tileCentre } from './support/game'

// Things that fall, in rooms from the original's table: the room's first
// spiked ball lets go (handler at 0xB7A9) and a falling block sinks under
// Sabreman (0xB683).

const at = (cell: Cell) => ({ x: tileCentre(cell.x), z: tileCentre(cell.z) })
const nearly = (a: number, b: number) => Math.abs(a - b) < 0.01

const dropperRoom = ROOM_SPECS.find((s) => s.spikedBalls?.some((b) => b.drops && !b.waits && b.height >= 3))!
const dropper = dropperRoom.spikedBalls!.find((b) => b.drops)!
const groundUnderDropper = dropperRoom.platforms?.find((p) => p.x === dropper.x && p.z === dropper.z)?.height ?? 0

test(`${dropperRoom.id}: the room's first spiked ball lets go and lies where it lands; the others hang on`, async ({ page }) => {
  await startGame(page)
  await enterRoom(page, dropperRoom.id)
  await holdDaylight(page)
  const ball = at(dropper)
  const heightOf = async () => (await debug(page)).spikedBalls.find((b) => nearly(b.x, ball.x) && nearly(b.z, ball.z))!.y

  expect(await heightOf()).toBe(dropper.height)
  await expect.poll(heightOf, { timeout: 20_000, message: 'the dropper lands' }).toBe(groundUnderDropper)
  const hanging = (await debug(page)).spikedBalls.filter((b) => !(nearly(b.x, ball.x) && nearly(b.z, ball.z)))
  const placed = dropperRoom.spikedBalls!.filter((b) => b !== dropper)
  expect(hanging.map((b) => b.y).sort()).toEqual(placed.map((b) => b.height).sort())
})

const bare = (s: (typeof ROOM_SPECS)[number], c: Cell) =>
  ![...(s.platforms ?? []), ...(s.spikes ?? []), ...(s.spikedBalls ?? [])].some((p) => p.x === c.x && p.z === c.z)
const sinkerRoom = ROOM_SPECS.find((s) => s.fallingBlocks?.some((f) => f.height >= 3 && bare(s, f)))!
const sinker = sinkerRoom.fallingBlocks!.find((f) => f.height >= 3 && bare(sinkerRoom, f))!

test(`${sinkerRoom.id}: a falling block sinks under Sabreman, carrying him down to the floor`, async ({ page }) => {
  await startGame(page)
  await enterRoom(page, sinkerRoom.id)
  await holdDaylight(page)
  const block = at(sinker)
  const topOf = async () => (await debug(page)).fallingBlocks.find((f) => nearly(f.x, block.x) && nearly(f.z, block.z))!.top
  expect(await topOf()).toBe(sinker.height)

  await standAt(page, { x: block.x, y: sinker.height, z: block.z })
  await expect.poll(topOf, { message: 'the block sinks' }).toBeLessThan(sinker.height)
  await expect.poll(topOf, { timeout: 15_000, message: 'the block rests on the floor' }).toBe(1)
  expect((await debug(page)).pos.y).toBe(1)
})
