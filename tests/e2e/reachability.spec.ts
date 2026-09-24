import { test, expect } from '@playwright/test'
import { ROOM_SPECS, entryFor, oppositeOf } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, startGame, walkPath, walkUntil } from './support/game'
import { DOOR_CELL, findFloorPath } from './support/roomPath'

// The castle walked for real: in every room, Sabreman comes in through the
// first door, then walks with the arrow keys to the charm (and picks it up)
// and out of every other door, without losing a life.

test.describe.configure({ mode: 'parallel' })

for (const spec of ROOM_SPECS) {
  const entrance = spec.exits[0]!
  const entryDoor = DOOR_CELL[entrance.direction]

  test(`${spec.id}: every door and charm can be walked to`, async ({ page }) => {
    await startGame(page)
    const enter = async () => {
      await enterRoom(page, spec.id, entryFor(oppositeOf(entrance.direction)))
      await holdDaylight(page)
    }

    let lives = (await debug(page)).lives
    for (const charm of spec.pickups ?? []) {
      await enter()
      await walkPath(page, findFloorPath(spec, entryDoor, charm))
      await page.keyboard.press('KeyE')
      if (charm.item === 'life') {
        lives += 1
        await expect.poll(async () => (await debug(page)).lives, { message: 'extra life taken' }).toBe(lives)
      } else {
        await expect.poll(async () => (await debug(page)).carrying, { message: `${charm.item} picked up` }).toBe(charm.item)
      }
    }

    for (const exit of spec.exits.slice(spec.exits.length > 1 ? 1 : 0)) {
      await enter()
      await walkPath(page, findFloorPath(spec, entryDoor, DOOR_CELL[exit.direction]))
      await face(page, exit.direction)
      await walkUntil(page, (state) => state.room === exit.target)
    }

    expect((await debug(page)).lives, 'lives lost on the way').toBe(lives)
  })
}
