import { test, expect } from '@playwright/test'
import { ROOM_SPECS, entryFor, oppositeOf, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, startGame, walkPath, walkUntil } from './support/game'
import { doorOf, findFloorPath, patrolledCells } from './support/roomPath'

// The castle walked for real: in every room, Sabreman comes in through the
// first door, then walks with the arrow keys (climbing blocks and jumping
// spike rows where the path needs it) to the charm, picks it up, and goes out
// of every other door he can reach on foot, without losing a life. In a room
// marked a puzzle, the doors that need a stepping stone are left out.

test.describe.configure({ mode: 'parallel' })

const walks = (spec: RoomSpec, from: { x: number; z: number }, to: { x: number; z: number }) => {
  try {
    findFloorPath(spec, from, to)
    return true
  } catch {
    return false
  }
}

for (const spec of ROOM_SPECS) {
  const entrance = spec.exits[0]!
  const entryDoor = doorOf(spec, entrance.direction)
  const exits = spec.exits.slice(spec.exits.length > 1 ? 1 : 0).filter((e) => walks(spec, entryDoor, doorOf(spec, e.direction)))
  const charms = (spec.pickups ?? []).filter((p) => walks(spec, entryDoor, p))

  test(`${spec.id}: every door and charm it can reach on foot can be walked to`, async ({ page }) => {
    await startGame(page)
    const enter = async () => {
      await enterRoom(page, spec.id, entryFor(oppositeOf(entrance.direction), spec.width ?? 8, spec.depth ?? 8))
      await holdDaylight(page)
    }

    let lives = (await debug(page)).lives
    for (const charm of charms) {
      await enter()
      await walkPath(page, findFloorPath(spec, entryDoor, charm), patrolledCells(spec))
      await page.keyboard.press('KeyE')
      if (charm.item === 'life') {
        lives += 1
        await expect.poll(async () => (await debug(page)).lives, { message: 'extra life taken' }).toBe(lives)
      } else {
        await expect.poll(async () => (await debug(page)).carrying, { message: `${charm.item} picked up` }).toBe(charm.item)
      }
    }

    for (const exit of exits) {
      await enter()
      await walkPath(page, findFloorPath(spec, entryDoor, doorOf(spec, exit.direction)), patrolledCells(spec))
      await face(page, exit.direction)
      await walkUntil(page, (state) => state.room === exit.target)
    }

    expect((await debug(page)).lives, 'lives lost on the way').toBe(lives)
  })
}
