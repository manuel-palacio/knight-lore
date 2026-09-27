import { test, expect, type Page } from '@playwright/test'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { debug, enterRoom, holdDaylight, standAt } from './support/game'

// Playing on a phone held sideways: the on-screen d-pad, Jump and E buttons
// (index.html #touch, src/engine/TouchControls.ts) stand for the keys.

const PHONE = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
const CHARM_HOVER = 0.4

let pointers = 0

// A finger on a button until `lift` is called.
async function press(page: Page, key: string): Promise<() => Promise<void>> {
  const button = page.locator(`#touch [data-key="${key}"]`)
  const box = (await button.boundingBox())!
  const at = { pointerId: ++pointers, pointerType: 'touch', isPrimary: true, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 }
  await button.dispatchEvent('pointerdown', at)
  return () => button.dispatchEvent('pointerup', at)
}

async function holdFor(page: Page, key: string, ms: number): Promise<void> {
  const lift = await press(page, key)
  await page.waitForTimeout(ms)
  await lift()
}

async function begin(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
  await page.locator('#begin').tap()
  await expect(page.locator('#intro')).toBeHidden()
  await holdDaylight(page)
}

// The highest he gets in a jump, Jump held for `holdMs` (0: a tap).
async function jumpPeak(page: Page, holdMs: number): Promise<number> {
  const lift = await press(page, 'Space')
  if (!holdMs) await lift()
  let peak = 0
  await expect.poll(async () => {
    const s = await debug(page)
    peak = Math.max(peak, s.pos.y)
    return s.state
  }, { intervals: [20] }).not.toBe('grounded')
  await expect.poll(async () => {
    const s = await debug(page)
    peak = Math.max(peak, s.pos.y)
    return s.state
  }, { intervals: [20] }).toBe('grounded')
  if (holdMs) await lift()
  return peak
}

test.describe('on a phone', () => {
  test.use(PHONE)

  test('the controls show, and a tap on the title begins the game', async ({ page }) => {
    await begin(page)
    for (const key of ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyP', 'KeyM']) {
      await expect(page.locator(`#touch [data-key="${key}"]`)).toBeVisible()
    }
  })

  test('the d-pad walks him forward and turns him', async ({ page }) => {
    await begin(page)
    const start = await debug(page)
    await holdFor(page, 'ArrowUp', 600)
    const walked = await debug(page)
    expect(Math.hypot(walked.pos.x - start.pos.x, walked.pos.z - start.pos.z)).toBeGreaterThan(1)
    await holdFor(page, 'ArrowRight', 60)
    await expect.poll(async () => (await debug(page)).facing).not.toBe(walked.facing)
  })

  test('Jump tapped is a low jump, a block high; held, a high one, over two blocks', async ({ page }) => {
    await begin(page)
    const low = await jumpPeak(page, 0)
    expect(low).toBeGreaterThan(0.5)
    expect(low).toBeLessThanOrEqual(1.01)
    const high = await jumpPeak(page, 2000)
    expect(high).toBeGreaterThan(2)
  })

  test('E picks up a charm', async ({ page }) => {
    await begin(page)
    const room = ROOM_SPECS.find((s) => s.pickups?.some((p) => p.item !== 'life'))!
    const at = await enterRoom(page, room.id)
    const charm = at.pickups.find((p) => p.id !== 'life')!
    await standAt(page, { ...charm, y: charm.y - CHARM_HOVER })
    await holdFor(page, 'KeyE', 100)
    await expect.poll(async () => (await debug(page)).carrying).toContain(charm.id)
  })

  test('the page neither scrolls nor zooms while he is played', async ({ page }) => {
    await begin(page)
    await holdFor(page, 'ArrowUp', 300)
    await page.touchscreen.tap(422, 200)
    const view = await page.evaluate(() => ({ scrollX: window.scrollX, scrollY: window.scrollY, scale: window.visualViewport?.scale ?? 1, touchAction: getComputedStyle(document.body).touchAction }))
    expect(view).toEqual({ scrollX: 0, scrollY: 0, scale: 1, touchAction: 'none' })
  })
})

test('on a desktop without touch the controls stay hidden', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
  await expect(page.locator('#touch')).toBeHidden()
  await expect(page.locator('#begin')).toBeHidden()
})
