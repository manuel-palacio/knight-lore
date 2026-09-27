import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS, entryFor, oppositeOf, type Direction, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, give, holdDaylight, startGame, tileCentre, walkPath, walkUntil } from './support/game'
import { dangersOf, doorOf, findFloorPath, type Step } from './support/roomPath'
import { SOLVED_PUZZLES } from './support/puzzles'

// The puzzle rooms (tools/rip/castle.py marks them: some door cannot be
// reached on foot), each crossed both ways with the keyboard, as the
// original has them solved. Charms are put in his hands on the way in, as if
// carried from elsewhere; E puts one down under his feet and he stands on
// it a block higher, a held jump rises two more with a run-up, and walking
// into a table pushes it.

const spec = (id: (typeof SOLVED_PUZZLES)[number]) => ROOM_SPECS.find((s) => s.id === id)!

// The room as the jump planner should see it once charms lie in it.
function withCharms(room: RoomSpec, cells: Step[]): RoomSpec {
  return { ...room, id: `${room.id} with charms at ${JSON.stringify(cells)}`, pickups: cells.map((c) => ({ x: c.x, z: c.z, item: 'gem', y: c.y + 0.4 })) }
}

async function enterBy(page: Page, room: RoomSpec, door: Direction, charms = 0): Promise<void> {
  await enterRoom(page, room.id, entryFor(oppositeOf(door), room.width ?? 8, room.depth ?? 8))
  await holdDaylight(page)
  if (charms) await give(page, Array.from({ length: charms }, () => 'gem'))
}

// Only standing: having just walked off a charm, he may still be dropping to the floor.
async function putDown(page: Page): Promise<void> {
  await expect.poll(async () => (await debug(page)).state).toBe('grounded')
  const { pos, carrying } = await debug(page)
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying.length).toBe(carrying.length - 1)
  expect((await debug(page)).pos.y).toBe(pos.y + 1)
}

async function leaveBy(page: Page, room: RoomSpec, door: Direction): Promise<void> {
  const target = room.exits.find((e) => e.direction === door)!.target
  if ((await debug(page)).room === target) return
  await face(page, door)
  await walkUntil(page, (s) => s.room === target)
}

async function walk(page: Page, room: RoomSpec, path: Step[]): Promise<void> {
  await walkPath(page, path, dangersOf(room))
}

// Over a wall three blocks high: two charms put down in line before it (the
// one he stands on, the one he runs up across), a held jump onto the wall,
// and down the far side. `cells` runs from the door he came in by to the
// door he leaves by, through the two charm cells and the wall.
async function overTheWall(page: Page, room: RoomSpec, from: Direction, to: Direction, cells: { approach: Step[]; first: Step; second: Step; wall: Step; beyond: Step[] }): Promise<void> {
  const { approach, first, second, wall, beyond } = cells
  await enterBy(page, room, from, 2)
  await walk(page, room, [...approach, first])
  await putDown(page)
  await walk(page, room, [{ ...first, y: 1 }, second])
  await putDown(page)
  const laid = withCharms(room, [first, second])
  await walk(page, laid, [{ ...second, y: 1 }, { ...first, y: 1 }])
  await walk(page, laid, [{ ...first, y: 1 }, { ...second, y: 1 }, wall, ...beyond])
  await leaveBy(page, room, to)
  expect((await debug(page)).lives).toBe(5)
}

const floor = (x: number, z: number): Step => ({ x, z, y: 0 })
const column = (x: number, zs: number[]) => zs.map((z) => floor(x, z))

test.describe.configure({ mode: 'parallel' })

for (const id of ['map--5-4', 'map-5-6'] as const) {
  test(`${id}: over the three-high wall with two charms, south to north and back`, async ({ page }) => {
    test.setTimeout(120_000)
    await startGame(page)
    const room = spec(id)
    await overTheWall(page, room, 'south', 'north', { approach: column(2, [7]), first: floor(2, 6), second: floor(2, 5), wall: { x: 2, z: 4, y: 3 }, beyond: column(2, [3, 2, 1, 0]) })
    await overTheWall(page, room, 'north', 'south', { approach: column(2, [0, 1]), first: floor(2, 2), second: floor(2, 3), wall: { x: 2, z: 4, y: 3 }, beyond: column(2, [5, 6, 7]) })
  })
}

test('map-7-1: over the wall at its one cell without spikes, with two charms, both ways', async ({ page }) => {
  test.setTimeout(120_000)
  await startGame(page)
  const room = spec('map-7-1')
  await overTheWall(page, room, 'south', 'north', {
    approach: [floor(2, 7), floor(1, 7), floor(0, 7)], first: floor(0, 6), second: floor(0, 5), wall: { x: 0, z: 4, y: 3 },
    beyond: [floor(0, 3), floor(1, 3), floor(2, 3), floor(2, 2), floor(2, 1), floor(2, 0)],
  })
  await overTheWall(page, room, 'north', 'south', {
    approach: [floor(2, 0), floor(1, 0), floor(0, 0), floor(0, 1)], first: floor(0, 2), second: floor(0, 3), wall: { x: 0, z: 4, y: 3 },
    beyond: [floor(0, 5), floor(1, 5), floor(2, 5), floor(2, 6), floor(2, 7)],
  })
})

test('map--1--3: onto a block of the diagonal with two charms, and down the other side, both ways', async ({ page }) => {
  test.setTimeout(120_000)
  await startGame(page)
  const room = spec('map--1--3')
  await overTheWall(page, room, 'south', 'north', { approach: column(2, [7, 6]), first: floor(2, 5), second: floor(2, 4), wall: { x: 2, z: 3, y: 3 }, beyond: column(2, [2, 1, 0]) })
  await overTheWall(page, room, 'north', 'south', { approach: column(2, [0]), first: floor(2, 1), second: floor(2, 2), wall: { x: 2, z: 3, y: 3 }, beyond: column(2, [4, 5, 6, 7]) })
})

// Collapsing blocks over spikes between two blocks a block high: a charm put
// down on the near block, and a held jump from it clears them to the far one.
test('map--5--8: from block to block over the collapsing blocks, off a charm, both ways', async ({ page }) => {
  test.setTimeout(120_000)
  await startGame(page)
  const room = spec('map--5--8')
  for (const [from, to, near, far, beyond] of [
    ['east', 'west', 5, 2, [1, 0]],
    ['west', 'east', 2, 5, [6, 7]],
  ] as const) {
    await enterBy(page, room, from, 1)
    const door = doorOf(room, from)
    const step = Math.sign(near - door.x)
    await walk(page, room, [floor(door.x, 2), floor(near - step, 2), { x: near, z: 2, y: 1 }])
    await putDown(page)
    const laid = withCharms(room, [{ x: near, z: 2, y: 1 }])
    await walk(page, laid, [{ x: near, z: 2, y: 2 }, { x: far, z: 2, y: 1 }, ...beyond.map((x) => floor(x, 2))])
    await leaveBy(page, room, to)
    expect((await debug(page)).lives).toBe(5)
  }
})

// A row of tables two high with spiked balls on top: walking into the stack
// before the door pushes it out of the row, and he goes round it to the door,
// under the balls it held up. They hang there until one lets go (any ball of
// the room may, one at a time, 0xB7A9): a run cut short by a ball coming down,
// or by the balls fallen in the gap, is run again from the door, as a player
// would come back in.
const RUNS_UNDER_THE_BALLS = 8

test('map--4--5: pushes the table stack out of the row and runs under the balls before they drop, both ways', async ({ page }) => {
  test.setTimeout(300_000)
  await startGame(page)
  const room = spec('map--4--5')
  for (const [from, to, pastTheRow, round] of [
    ['south', 'north', (z: number) => z <= tileCentre(3), [floor(2, 3), floor(1, 3), floor(1, 2), floor(1, 1), floor(1, 0), floor(2, 0)]],
    ['north', 'south', (z: number) => z >= tileCentre(5), [floor(2, 5), floor(1, 5), floor(1, 6), floor(1, 7), floor(2, 7)]],
  ] as const) {
    for (let run = 1; ; run++) {
      if ((await debug(page)).lives < 2) await startGame(page)
      const lives = (await debug(page)).lives
      const failure = await (async () => {
        await enterBy(page, room, from)
        await walk(page, room, from === 'south' ? column(2, [7, 6, 5]) : column(2, [0, 1, 2, 3]))
        await face(page, to)
        await walkUntil(page, (s) => pastTheRow(s.pos.z))
        await walk(page, room, [...round])
        await leaveBy(page, room, to)
      })().then(
        async () => ((await debug(page)).lives < lives ? new Error('a ball came down on him') : null),
        (err: Error) => err,
      )
      if (!failure) break
      if (run >= RUNS_UNDER_THE_BALLS) throw failure
    }
  }
})

// Steps up along the back wall, a block higher each, to a falling block level
// with the last, which sinks under him to the floor by the north door, walled
// in by spikes. The falling block only goes down: this way only, on foot.
test('map--6--6: up the steps along the back wall, down with the falling block, out of the north door', async ({ page }) => {
  test.setTimeout(120_000)
  await startGame(page)
  const room = spec('map--6--6')
  await enterBy(page, room, 'west')
  await walk(page, room, findFloorPath(room, doorOf(room, 'west'), doorOf(room, 'north')))
  await leaveBy(page, room, 'north')
  expect((await debug(page)).lives).toBe(5)
})

// map-4--2's chests wall the room off, a cell apart with a gap between each
// two, and the west door lines him up on a gap: his body still meets them.
test('map-4--2: walking in from the west door, he cannot pass through the wall of chests', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map-4--2', entryFor('east', 8, 4))
  await holdDaylight(page)
  await face(page, 'east')
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(7_000)
  await page.keyboard.up('ArrowUp')
  expect((await debug(page)).room).toBe('map-4--2')
  // He pushes the chests in front of him on to the east wall (x 16), and
  // stays behind them: short of it by a chest, 18 pixels across, and half himself.
  const chestAcross = 18 / 8
  expect((await debug(page)).pos.x).toBeLessThan(16 - chestAcross - 0.4)
})
