import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS, entryFor, oppositeOf, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { itemAtSpot } from '../../src/game/GameState'
import { clearestPath, debug, enterRoom, face, holdDaylight, startGame, walkPath, walkUntil } from './support/game'
import { dangersOf, doorOf, exitOf, findFloorPath, findFloorPaths } from './support/roomPath'

// The castle walked for real: in every room, Sabreman comes in through the
// first door, then walks with the arrow keys (climbing blocks and jumping
// spike rows where the path needs it) to the charm, picks it up, and goes out
// of every other door he can reach on foot, without losing a life. In a room
// marked a puzzle, the doors that need a stepping stone are left out. Ghosts
// and hopping balls wander at random, the ghosts faster than he walks: in
// their rooms a walk that costs a life is walked again. So too, a few times,
// where he crosses a guard's or a ball's path on its timing, which a busy
// machine can make him miss. Where spiked balls drop at random, a walk they
// cut short is walked again too, as a player would come back in.

const TRIES_WITH_WANDERERS = 8
const TRIES_ON_TIMING = 3


test.describe.configure({ mode: 'parallel' })

const walks = (spec: RoomSpec, from: { x: number; z: number }, to: { x: number; z: number; y?: number }) => {
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
  const exits = spec.exits.slice(spec.exits.length > 1 ? 1 : 0).filter((e) => walks(spec, entryDoor, exitOf(spec, e.direction)))
  // Charm spots it can be walked to (many lie high, reached by stepping on other charms).
  // A spot half way between cells is reached from the cell below and left of it: within a stride.
  const charms = (spec.charmSpots ?? []).map((c) => ({ ...c, x: Math.floor(c.x), z: Math.floor(c.z), y: c.height })).filter((p) => walks(spec, entryDoor, p))

  // Spiked balls let go at random, one at a time (0xB7A9), and those down can shut a corridor.
  const dropping = (spec.spikedBalls ?? []).some((b) => !b.waits)
  const wanderers = (spec.ghosts?.length ?? 0) + (spec.hoppers?.length ?? 0) > 0 || dropping
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
        // A sparkle cloud makes for him and is stepped round, which the walker
        // cannot do: the room's layout is walked without it (see followers.spec.ts).
        if (spec.followers) await page.evaluate(() => (window as unknown as { __noFollowers: () => void }).__noFollowers())
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
      await walk(`to charm spot ${charm.spot}`, async () => {
        const lives = (await debug(page)).lives
        const item = itemAtSpot(charm.spot, (await debug(page)).deal)
        await walkPath(page, await clearestPath(page, findFloorPaths(spec, entryDoor, charm), dangersOf(spec)), dangersOf(spec))
        // Down from a drop or off a sinking block before reaching for it.
        await expect.poll(async () => (await debug(page)).state, { timeout: 10_000 }).toBe('grounded')
        if (item === 'life') {
          // Taken by touching it (0xC1AB): onto where it lies, which may be between cells.
          const life = (await debug(page)).pickups.find((p) => p.id === 'life')
          if (life) await stepOnto(page, life, lives)
          await expect.poll(async () => (await debug(page)).lives, { message: 'extra life taken' }).toBe(lives + 1)
        } else {
          await page.keyboard.press('KeyE')
          await expect.poll(async () => (await debug(page)).carrying, { message: `${item} picked up` }).toContain(item)
        }
      })
    }

    for (const exit of exits) {
      await walk(`out of the ${exit.direction} door`, async () => {
        await walkPath(page, await clearestPath(page, findFloorPaths(spec, entryDoor, exitOf(spec, exit.direction)), dangersOf(spec)), dangersOf(spec))
        await face(page, exit.direction)
        await walkUntil(page, (state) => state.room === exit.target)
      })
    }
  })
}

// Walks onto a point, one axis at a time, stopping as soon as a life is gained.
async function stepOnto(page: Page, at: { x: number; z: number }, lives: number): Promise<void> {
  for (const axis of ['x', 'z'] as const) {
    const here = (await debug(page)).pos
    if (Math.abs(here[axis] - at[axis]) < 0.3) continue
    const ahead = here[axis] < at[axis]
    await face(page, axis === 'x' ? (ahead ? 'east' : 'west') : (ahead ? 'south' : 'north'))
    await walkUntil(page, (s) => s.lives > lives || Math.abs(s.pos[axis] - at[axis]) < 0.3)
  }
}
