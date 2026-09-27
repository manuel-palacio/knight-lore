import { test, expect } from '@playwright/test'
import { ROOM_SPECS, type Cell } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, holdDaylight, standAt, startGame, tileCentre } from './support/game'

// Things that fall, in rooms from the original's table: the room's first
// spiked ball lets go (handler at 0xB7A9) and a falling block sinks under
// Sabreman (0xB683).

const at = (cell: Cell) => ({ x: tileCentre(cell.x), z: tileCentre(cell.z) })
const nearly = (a: number, b: number) => Math.abs(a - b) < 0.01

// A room whose balls hang well up over bare floor, and do not wait for a pick-up.
const ballRoom = ROOM_SPECS.find((s) => (s.spikedBalls?.length ?? 0) >= 2 && s.spikedBalls!.every((b) => !b.waits && b.height >= 3 && !(s.platforms ?? []).some((p) => p.x === b.x && p.z === b.z)))!

test(`${ballRoom.id}: the spiked balls let go one at a time and lie on the floor`, async ({ page }) => {
  test.setTimeout(90_000)
  await startGame(page)
  await enterRoom(page, ballRoom.id)
  await holdDaylight(page)
  const cells = Array.from({ length: ballRoom.width ?? 8 }, (_, x) => Array.from({ length: ballRoom.depth ?? 8 }, (_, z) => ({ x, z }))).flat()
  // A ball comes down in its own cell: stand in one without a ball.
  const clear = cells.find((c) => !ballRoom.spikedBalls!.some((b) => b.x === c.x && b.z === c.z))!
  await standAt(page, { x: tileCentre(clear.x), y: 0, z: tileCentre(clear.z) })
  const heights = async () => (await debug(page)).spikedBalls.map((b) => b.y)
  const hanging = await heights()
  expect(hanging.every((y) => y >= 3)).toBe(true)
  let twoAtOnce = false
  await expect.poll(async () => {
    const now = await heights()
    const falling = now.filter((y) => y > 0 && !hanging.includes(y)).length
    if (falling > 1) twoAtOnce = true
    return now.filter((y) => y === 0).length
  }, { timeout: 60_000, intervals: [30], message: 'every ball down' }).toBe(hanging.length)
  expect(twoAtOnce, 'two balls falling at once').toBe(false)
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
