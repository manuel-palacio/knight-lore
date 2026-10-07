import { test, expect, type Page } from '@playwright/test'
import { CHARMS } from '../../src/game/GameState'
import { debug, face, give, jump, startGame } from './support/game'
import { doorOf, type Step } from './support/roomPath'
import { enterBy, leaveBy, putDown, walk, withCharms } from './support/puzzles'
import { specById } from './support/specs'

// The original's charm spots that are not walked to (most of them): each
// fetched with the keyboard as the original has it solved, from a door and
// out by a door with the charm, no life lost. Spare charms are put in his
// hands on the way in, as if carried from elsewhere. What these lean on:
// E puts down the satchel's last charm under his feet (he stands on it, a
// block up); picking one up with the satchel full lets go of the charm
// carried longest where the new one lay, under him; a room holds two
// charms on its floor; a held jump rises two blocks and a third.

const at = (x: number, z: number, y = 0): Step => ({ x, z, y })

// The game's random numbers pinned, for a known deal of the charms (and
// nothing left to chance on the way): at 0.1, the original's deal 1.
async function pinRandom(page: Page, value: number): Promise<void> {
  await page.addInitScript((v) => { Math.random = () => v }, value)
}

// The charm lying at a spot's cell, and two spare kinds of charm unlike it.
async function charmAt(page: Page, cell: { x: number; z: number }): Promise<{ id: string; spares: string[] }> {
  const charm = (await debug(page)).pickups.find((p) => Math.floor(p.x / 2) === cell.x && Math.floor(p.z / 2) === cell.z)
  if (!charm) throw new Error(`no charm at ${cell.x},${cell.z}`)
  return { id: charm.id, spares: CHARMS.filter((c) => c !== charm.id).slice(0, 2) }
}

async function hasTaken(page: Page, id: string): Promise<void> {
  await expect.poll(async () => (await debug(page)).carrying).toContain(id)
}

// From the spare the pick-up let go of under him, a held jump onto what is `height` high that way.
async function upFromTheSpare(page: Page, facing: string, height: number): Promise<void> {
  await expect.poll(async () => (await debug(page)).state).toBe('grounded')
  expect((await debug(page)).pos.y).toBe(1)
  await face(page, facing)
  await jump(page, true)
  expect((await debug(page)).pos.y).toBe(height)
}

async function stillAliveWith(page: Page, id: string): Promise<void> {
  const end = await debug(page)
  expect(end.lives).toBe(5)
  expect(end.carrying).toContain(id)
}

// Spot 4: on the floor in a pit, columns three high north and south of it,
// columns of spikes east and west. Up a column from a charm, down into the
// pit; the pick-up leaves a spare under him, and from it he jumps back up.
test('spot 4 (map-2-3): into the spiked pit from a column, and out from the charm let go of', async ({ page }) => {
  const room = specById('map-2-3')
  await pinRandom(page, 0.1)
  await startGame(page)
  await enterBy(page, room, 'south')
  const { id, spares } = await charmAt(page, { x: 3, z: 3 })
  await give(page, spares)
  await walk(page, room, [doorOf(room, 'south') as Step, at(3, 7), at(3, 6), at(3, 5)])
  await putDown(page)
  const outside = withCharms(room, [at(3, 5)])
  await walk(page, outside, [at(3, 5, 1), at(3, 4, 3)])
  await walk(page, outside, [at(3, 4, 3), at(3, 3, 1)])
  await page.keyboard.press('KeyE')
  await hasTaken(page, id)
  const inThePit = withCharms(room, [at(3, 5), at(3, 3)])
  await upFromTheSpare(page, 'south', 3)
  await walk(page, inThePit, [at(3, 4, 3), at(3, 5, 1), at(3, 6), at(4, 6), at(4, 7)])
  await leaveBy(page, room, 'south')
  await stillAliveWith(page, id)
})

// Spot 3: the same pit turned about, hedges three high east and west of it,
// columns of spikes north and south. Up the west hedge from a charm, down
// into the pit, and back up it from the spare the pick-up lets go of.
test('spot 3 (map-2--8): into the pit between the hedges, and out from the charm let go of', async ({ page }) => {
  const room = specById('map-2--8')
  await pinRandom(page, 0.1)
  await startGame(page)
  await enterBy(page, room, 'west')
  const { id, spares } = await charmAt(page, { x: 3, z: 3 })
  await give(page, spares)
  await walk(page, room, [doorOf(room, 'west') as Step, at(1, 4), at(1, 3)])
  await putDown(page)
  const outside = withCharms(room, [at(1, 3)])
  await walk(page, outside, [at(1, 3, 1), at(2, 3, 3)])
  await walk(page, outside, [at(2, 3, 3), at(3, 3, 1)])
  await page.keyboard.press('KeyE')
  await hasTaken(page, id)
  await upFromTheSpare(page, 'west', 3)
  await walk(page, withCharms(room, [at(1, 3), at(3, 3)]), [at(2, 3, 3), at(1, 3, 1), at(1, 4), at(0, 4)])
  await leaveBy(page, room, 'west')
  await stillAliveWith(page, id)
})

// Spot 12: on the floor of a shut corner, columns three high north and east
// of it, floating blocks over it, and in their roof a falling block four
// high. Up a column from a charm, onto the falling block, and down with it
// as it sinks under him; back out from it, sunk a block high, up the column.
test('spot 12 (map--8--8): down into the shut corner on the falling block, and out up the column', async ({ page }) => {
  const room = specById('map--8--8')
  await pinRandom(page, 0.1)
  await startGame(page)
  await enterBy(page, room, 'north')
  const { id, spares } = await charmAt(page, { x: 0, z: 7 })
  await give(page, spares)
  await walk(page, room, [doorOf(room, 'north') as Step, at(4, 1), at(4, 2), at(4, 3), at(4, 4), at(3, 4), at(2, 4), at(1, 4)])
  await putDown(page)
  const outside = withCharms(room, [at(1, 4)])
  await walk(page, outside, [at(1, 4, 1), at(1, 5, 3)])
  await walk(page, outside, [at(1, 5, 3), at(1, 6, 4)])
  await expect.poll(async () => (await debug(page)).pos.y, { timeout: 10_000 }).toBe(1)
  await walk(page, outside, [at(1, 6, 1), at(0, 6), at(0, 7)])
  await page.keyboard.press('KeyE')
  await hasTaken(page, id)
  const sunk = { ...withCharms(room, [at(1, 4), at(0, 7)]), fallingBlocks: [{ x: 1, z: 6, height: 1 }] }
  await walk(page, sunk, [at(0, 7), at(0, 6), at(1, 6, 1)])
  await face(page, 'north')
  await jump(page, true)
  expect((await debug(page)).pos.y).toBe(3)
  await walk(page, outside, [at(1, 5, 3), at(1, 4, 1), at(2, 4), at(3, 4), at(4, 4), at(4, 3), at(4, 2), at(4, 1), at(4, 0)])
  await leaveBy(page, room, 'north')
  await stillAliveWith(page, id)
})
