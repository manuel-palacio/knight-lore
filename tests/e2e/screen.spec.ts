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

async function pixelsIn(page: Page, area: { x: number; y: number; w: number; h: number }): Promise<number[]> {
  return page.evaluate((area) => {
    const canvas = document.querySelector('#app canvas') as HTMLCanvasElement
    return Array.from(canvas.getContext('2d')!.getImageData(area.x, area.y, area.w, area.h).data)
  }, area)
}

const changedPixels = (a: number[], b: number[]) => a.filter((v, i) => i % 4 < 3 && v !== b[i]).length

const anyColour = (r: number, g: number, b: number) => r + g + b > 60
const white = (r: number, g: number, b: number) => r > 200 && g > 200 && b > 200

// Between the scrolls, under the line the HUD starts at (row 128): the front
// spike bed of map-0--1 sits there, as the original draws a room's near corner.
const BETWEEN_THE_SCROLLS = { x: 104, y: 128, w: 36, h: 18 }
// Over the cauldron (room-001, its middle): the charm there, 32 pixels up,
// has its bottom row at 39 + 4 * 18 - 32 + 4 = 83 (see IsoProjection). And
// the scroll's right-hand end.
const OVER_THE_CAULDRON = { x: 118, y: 64, w: 20, h: 20 }
const SCROLL_END = { x: 212, y: 168, w: 22, h: 20 }

test('the room is drawn down between the scrolls, not cut off at the HUD', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map-0--1')
  await holdDaylight(page)
  await expect.poll(() => litPixels(page, BETWEEN_THE_SCROLLS, anyColour)).toBeGreaterThan(20)
})

test('the charm the cauldron wants hangs over it while he is a man, gone while he is the wolf, never in the scroll', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'room-001')
  await holdDaylight(page)
  const { wanted, overCauldron } = await debug(page)
  expect(overCauldron).toBe(wanted)
  expect(await litPixels(page, SCROLL_END, white)).toBe(0)
  await page.waitForTimeout(300)
  const asMan = await pixelsIn(page, OVER_THE_CAULDRON)
  await page.evaluate(() => (window as unknown as { __t: () => void }).__t())
  await expect.poll(async () => (await debug(page)).form).toBe('werewolf')
  expect((await debug(page)).overCauldron).toBeNull()
  await expect.poll(async () => changedPixels(asMan, await pixelsIn(page, OVER_THE_CAULDRON))).toBeGreaterThan(40)
})

// As on the Spectrum, one colour for the whole play area: in a green room
// Sabreman is green too, not the cream he once was, and no red shows above
// the HUD line (the HUD's red scroll is below it).
const ABOVE_THE_HUD = { x: 0, y: 0, w: 256, h: 128 }
const redderThanGreen = (r: number, g: number, _b: number) => r > g + 10

test('Sabreman is drawn in the room\'s colour', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map-0--1')
  await holdDaylight(page)
  await expect.poll(() => litPixels(page, ABOVE_THE_HUD, redderThanGreen)).toBe(0)
})

test('the page has a favicon: Sabreman\'s head, a PNG it can load', async ({ page }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(href).toBe('/favicon.png')
  const icon = await page.request.get(href!)
  expect(icon.ok()).toBe(true)
  expect(icon.headers()['content-type']).toBe('image/png')
})

// Colours: the original's (one ink to a room) by default; O switches to the
// map's, with what hurts red and what he takes white (see Palette).
async function redPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, 150).data
    let red = 0
    for (let i = 0; i < data.length; i += 4) if (data[i] === 0xea && data[i + 1] === 0x33 && data[i + 2] === 0x23) red++
    return red
  })
}

test('the guard is drawn in the room\'s ink, and red once O switches to the map\'s colours', async ({ page }) => {
  await startGame(page)
  await enterRoom(page, 'map-0--1', { x: 8, z: 8 })
  await holdDaylight(page)
  await page.waitForTimeout(300)
  expect(await redPixels(page)).toBe(0)
  await page.keyboard.press('KeyO')
  await expect.poll(() => redPixels(page)).toBeGreaterThan(20)
})

test('O on the title screen switches the colours without beginning the game, and the choice is kept', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
  await expect(page.locator('#colours')).toHaveText(/ORIGINAL/)
  await page.keyboard.press('KeyO')
  await expect(page.locator('#colours')).toHaveText(/MAP/)
  await expect(page.locator('#intro')).toBeVisible()
  await page.reload()
  await expect(page.locator('#colours')).toHaveText(/MAP/)
})
