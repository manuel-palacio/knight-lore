import { test, expect, type Page } from '@playwright/test'
import { GAME_OVER_TUNE, GAME_START_TUNE } from '../../src/engine/tunes'
import { debug, enterRoom, face, holdDaylight } from './support/game'

// The original's tunes. Oscillators are recorded through a wrapped
// AudioContext, since the test cannot listen.

async function recordTones(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const played: number[] = []
    ;(window as unknown as { __played: number[] }).__played = played
    const Original = window.AudioContext
    window.AudioContext = class extends Original {
      createOscillator(): OscillatorNode {
        const osc = super.createOscillator()
        const start = osc.start.bind(osc)
        osc.start = (when?: number) => { played.push(Math.round(osc.frequency.value * 10) / 10); start(when) }
        return osc
      }
    }
  })
}

function played(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as unknown as { __played: number[] }).__played)
}

function containsRun(tones: number[], run: number[]): boolean {
  return tones.some((_, i) => run.every((f, j) => tones[i + j] === f))
}

test('the start tune plays when the title screen is dismissed', async ({ page }) => {
  await recordTones(page)
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
  expect(await played(page)).toEqual([])
  await page.keyboard.press('Enter')
  const opening = GAME_START_TUNE.slice(0, 4).map((n) => n.frequency)
  await expect.poll(async () => (await played(page)).slice(0, 4)).toEqual(opening)
})

test('the game-over tune plays when Sabreman loses his last life', async ({ page }) => {
  test.setTimeout(60_000)
  await recordTones(page)
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
  await page.keyboard.press('Enter')
  await enterRoom(page, 'map--4-5')
  await holdDaylight(page)
  await face(page, 'south')
  const opening = GAME_OVER_TUNE.slice(0, 6).map((n) => n.frequency)
  expect(containsRun(await played(page), opening)).toBe(false)
  await page.keyboard.down('ArrowUp')
  await expect.poll(async () => (await debug(page)).lives, { timeout: 45_000 }).toBe(0)
  await page.keyboard.up('ArrowUp')
  await expect.poll(async () => containsRun(await played(page), opening)).toBe(true)
})
