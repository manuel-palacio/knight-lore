import { test, expect } from '@playwright/test'
import { ROOM_SPECS, entryFor, oppositeOf, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, startGame, walkPath, walkUntil } from './support/game'
import { dangersOf, doorOf, findFloorPath } from './support/roomPath'

// The castle walked for real: in every room, Sabreman comes in through the
// first door, then walks with the arrow keys (climbing blocks and jumping
// spike rows where the path needs it) to the charm, picks it up, and goes out
// of every other door he can reach on foot, without losing a life. In a room
// marked a puzzle, the doors that need a stepping stone are left out. Ghosts
// and hopping balls wander at random, the ghosts faster than he walks: in
// their rooms a walk that costs a life is walked again. So too, a few times,
// where he crosses a guard's or a ball's path on its timing, which a busy
// machine can make him miss.

const TRIES_WITH_WANDERERS = 8
const TRIES_ON_TIMING = 3


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

  const wanderers = (spec.ghosts?.length ?? 0) + (spec.hoppers?.length ?? 0) > 0
  const timed = (spec.pathGuards?.length ?? 0) + (spec.balls?.length ?? 0) > 0
  const tries = wanderers ? TRIES_WITH_WANDERERS : timed ? TRIES_ON_TIMING : 1

  test(`${spec.id}: every door and charm it can reach on foot can be walked to`, async ({ page }) => {
    // Wanderers may cost a walk or two; a grille with a guard past it, a few of its rises.
    test.setTimeout(wanderers ? 300_000 : 90_000)
    await startGame(page)
    // Each walk starts afresh at the door; a life lost on it fails the walk.
    const walk = async (description: string, leg: () => Promise<void>) => {
      for (let attempt = 1; ; attempt++) {
        if ((await debug(page)).lives < 2) await startGame(page)
        await enterRoom(page, spec.id, entryFor(oppositeOf(entrance.direction), spec.width ?? 8, spec.depth ?? 8))
        await holdDaylight(page)
        const lives = (await debug(page)).lives
        const failure = await leg().then(
          async () => ((await debug(page)).lives < lives ? new Error(`${description}: a life lost on the way`) : null),
          (err: Error) => err,
        )
        if (!failure) return
        if (attempt >= tries) throw failure
      }
    }

    for (const charm of charms) {
      await walk(`to the ${charm.item}`, async () => {
        const lives = (await debug(page)).lives
        await walkPath(page, findFloorPath(spec, entryDoor, charm), dangersOf(spec))
        await page.keyboard.press('KeyE')
        if (charm.item === 'life') {
          await expect.poll(async () => (await debug(page)).lives, { message: 'extra life taken' }).toBe(lives + 1)
        } else {
          await expect.poll(async () => (await debug(page)).carrying, { message: `${charm.item} picked up` }).toBe(charm.item)
        }
      })
    }

    for (const exit of exits) {
      await walk(`out of the ${exit.direction} door`, async () => {
        await walkPath(page, findFloorPath(spec, entryDoor, doorOf(spec, exit.direction)), dangersOf(spec))
        await face(page, exit.direction)
        await walkUntil(page, (state) => state.room === exit.target)
      })
    }
  })
}
