import { test, expect } from '@playwright/test'
import { ROOM_SPECS, entryFor, oppositeOf } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, standAt, startGame, tileCentre, walkPath, walkUntil } from './support/game'
import { doorOf, findFloorPath, isJump, type Step } from './support/roomPath'

// A room of the original barred by a spike row: the way between its first two
// doors has to jump it. Chosen from the data, the first such room.
const barred = ROOM_SPECS.filter((s) => !s.puzzle && s.exits.length >= 2).map((spec) => {
  try {
    const path = findFloorPath(spec, doorOf(spec, spec.exits[0]!.direction), doorOf(spec, spec.exits[1]!.direction))
    const at = path.findIndex((c, i) => i > 0 && isJump(path[i - 1]!, c))
    return at > 0 ? { spec, path, takeOff: path[at - 1]!, landing: path[at]! } : null
  } catch {
    return null
  }
}).find((r) => r !== null)!
const { spec } = barred
const entrance = spec.exits[0]!
const leave = spec.exits[1]!

function directionOf(from: Step, to: Step): string {
  return to.x > from.x ? 'east' : to.x < from.x ? 'west' : to.z > from.z ? 'south' : 'north'
}

async function enter(page: import('@playwright/test').Page): Promise<void> {
  await enterRoom(page, spec.id, entryFor(oppositeOf(entrance.direction), spec.width ?? 8, spec.depth ?? 8))
  await holdDaylight(page)
}

test('the spike row cannot be walked across: walking into it costs a life', async ({ page }) => {
  await startGame(page)
  await enter(page)
  await page.waitForTimeout(2_500) // let the grace after entering the room run out
  await standAt(page, { x: tileCentre(barred.takeOff.x), y: 0, z: tileCentre(barred.takeOff.z) })
  await face(page, directionOf(barred.takeOff, barred.landing))
  await walkUntil(page, (s) => s.lives < 5)
})

for (const form of ['human', 'werewolf'] as const) {
  test(`the ${form === 'human' ? 'man' : 'wolf'} jumps the spike row and reaches the far door unhurt`, async ({ page }) => {
    await startGame(page)
    await enter(page)
    if (form === 'werewolf') {
      await page.evaluate(() => (window as unknown as { __t: () => void }).__t())
      await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
    }
    await walkPath(page, barred.path)
    await face(page, leave.direction)
    await walkUntil(page, (s) => s.room === leave.target)
    expect((await debug(page)).lives).toBe(5)
  })
}

test('a jump taken from anywhere on the tile before the spikes clears them', async ({ page }) => {
  test.setTimeout(120_000)
  await startGame(page)
  await enter(page)
  await page.waitForTimeout(2_500)
  const facing = directionOf(barred.takeOff, barred.landing)
  const axis = barred.takeOff.x !== barred.landing.x ? 'x' : 'z'
  const sign = Math.sign(barred.landing[axis] - barred.takeOff[axis])
  const back = tileCentre(barred.takeOff[axis]) - sign
  for (let along = 0; along < 2; along += 0.25) {
    const spot = { x: tileCentre(barred.takeOff.x), y: 0, z: tileCentre(barred.takeOff.z) }
    spot[axis] = back + sign * along
    await standAt(page, spot)
    await face(page, facing)
    await page.keyboard.down('ArrowUp')
    await page.keyboard.press('Space')
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).not.toBe('grounded')
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).toBe('grounded')
    await page.keyboard.up('ArrowUp')
    expect((await debug(page)).lives, `take-off at ${axis}=${spot[axis]}`).toBe(5)
  }
})
