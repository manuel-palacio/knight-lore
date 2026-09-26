import { test, expect } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, standAt, startGame, walkPath, walkUntil } from './support/game'
import { findFloorPath } from './support/roomPath'

// The room south of the start is barred by a row of spikes wall to wall, as
// in the original: Sabreman has to jump it.
const BARRED = 'map--4-5'
const spec = ROOM_SPECS.find((s) => s.id === BARRED)!

test('the spike row cannot be walked round, and walking into it costs a life', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, BARRED)
  await holdDaylight(page)
  await face(page, 'south')
  await walkUntil(page, (s) => s.lives < 5)
})

for (const form of ['human', 'werewolf'] as const) {
  test(`the ${form === 'human' ? 'man' : 'wolf'} jumps the spike row and reaches the far door unhurt`, async ({ page }) => {
    await startGame(page)
    await enterRoom(page, BARRED)
    if (form === 'werewolf') {
      await page.evaluate(() => (window as unknown as { __t: () => void }).__t())
      await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
    } else {
      await holdDaylight(page)
    }
    await walkPath(page, findFloorPath(spec, { x: 4, z: 0 }, { x: 4, z: 7 }))
    await face(page, 'south')
    await walkUntil(page, (s) => s.room === 'map--4-6')
    expect((await debug(page)).lives).toBe(5)
  })
}

test('a jump taken from anywhere on the tile before the spikes clears them', async ({ page }) => {
  test.setTimeout(120_000)
  await startGame(page)
  await enterRoom(page, BARRED)
  await holdDaylight(page)
  await page.waitForTimeout(2_500) // let the grace after entering the room run out
  const tileBeforeSpikes = { from: 6, to: 8 }
  for (let z = tileBeforeSpikes.from; z < tileBeforeSpikes.to; z += 0.25) {
    await standAt(page, { x: 9, y: 0, z })
    await face(page, 'south')
    await page.keyboard.down('ArrowUp')
    await page.keyboard.press('Space')
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).not.toBe('grounded')
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).toBe('grounded')
    await page.keyboard.up('ArrowUp')
    expect((await debug(page)).lives, `take-off at z=${z}`).toBe(5)
  }
})
