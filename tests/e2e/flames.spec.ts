import { test, expect } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, holdDaylight, startGame } from './support/game'

// The original's flames go to and fro along one axis (0xB80F, 0xB7ED).
for (const axis of ['x', 'z'] as const) {
  // A room whose only monsters are its flames, so they are the debug hook's monsters, in order.
  const onlyFlames = (s: (typeof ROOM_SPECS)[number]) => !s.pathGuards?.length && !s.balls?.length && !s.ghosts?.length && !s.hoppers?.length
  const spec = ROOM_SPECS.find((s) => onlyFlames(s) && s.flames?.some((f) => f.axis === axis))
  test(`a flame moving along ${axis} moves along ${axis} only, in ${spec?.id}`, async ({ page }) => {
    test.skip(!spec, `no flame moves along ${axis}`)
    await startGame(page)
    await enterRoom(page, spec!.id)
    await holdDaylight(page)
    const flames = async () => (await debug(page)).monsters
    const before = await flames()
    await page.waitForTimeout(500)
    const after = await flames()
    const index = spec!.flames!.findIndex((f) => f.axis === axis)
    const other = axis === 'x' ? 'z' : 'x'
    expect(after[index]![axis]).not.toBe(before[index]![axis])
    expect(after[index]![other]).toBe(before[index]![other])
  })
}
