import { test, expect } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, face, holdDaylight, startGame, walkPath, walkUntil } from './support/game'
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
