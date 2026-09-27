import { test, expect, type Page } from '@playwright/test'
import { debug, enterRoom, holdDaylight, startGame } from './support/game'

// What the original shows on screen, pixel for pixel of the 256x192 canvas.

async function litPixels(page: Page, area: { x: number; y: number; w: number; h: number }, lit: (r: number, g: number, b: number) => boolean): Promise<number> {
  return page.evaluate(({ area, lit }) => {
    const canvas = document.querySelector('#app canvas') as HTMLCanvasElement
    const d = canvas.getContext('2d')!.getImageData(area.x, area.y, area.w, area.h).data
    const isLit = new Function('r', 'g', 'b', `return (${lit})(r, g, b)`) as (r: number, g: number, b: number) => boolean
    let count = 0
    for (let i = 0; i < d.length; i += 4) if (isLit(d[i]!, d[i + 1]!, d[i + 2]!)) count++
    return count
  }, { area, lit: lit.toString() })
}

const anyColour = (r: number, g: number, b: number) => r + g + b > 60
const white = (r: number, g: number, b: number) => r > 200 && g > 200 && b > 200

// Between the scrolls, under the line the HUD starts at (row 128): the front
// spike bed of map-0--1 sits there, as the original draws a room's near corner.
const BETWEEN_THE_SCROLLS = { x: 104, y: 128, w: 36, h: 18 }
// Over the cauldron (room-001, its middle), and the scroll's right-hand end.
const OVER_THE_CAULDRON = { x: 118, y: 44, w: 20, h: 20 }
const SCROLL_END = { x: 212, y: 168, w: 22, h: 20 }

test('the room is drawn down between the scrolls, not cut off at the HUD', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map-0--1')
  await holdDaylight(page)
  await expect.poll(() => litPixels(page, BETWEEN_THE_SCROLLS, anyColour)).toBeGreaterThan(20)
})

test('the charm the cauldron wants hangs over it while he is a man, not in the scroll', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'room-001')
  await holdDaylight(page)
  const { wanted, overCauldron } = await debug(page)
  expect(overCauldron).toBe(wanted)
  await expect.poll(() => litPixels(page, OVER_THE_CAULDRON, white)).toBeGreaterThan(20)
  expect(await litPixels(page, SCROLL_END, white)).toBe(0)
})

test('while he is the wolf nothing hangs over the cauldron', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'room-001')
  await page.evaluate(() => (window as unknown as { __t: () => void }).__t())
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
  expect((await debug(page)).overCauldron).toBeNull()
  await expect.poll(() => litPixels(page, OVER_THE_CAULDRON, white)).toBe(0)
})
