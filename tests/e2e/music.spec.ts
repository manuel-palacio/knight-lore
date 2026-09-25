import { test, expect } from '@playwright/test'
import { GAME_START_TUNE } from '../../src/engine/tunes'

// The original's start tune plays when the game begins. Oscillators are
// recorded through a wrapped AudioContext, since the test cannot listen.

test('the start tune plays when the title screen is dismissed', async ({ page }) => {
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
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
  expect(await page.evaluate(() => (window as unknown as { __played: number[] }).__played)).toEqual([])
  await page.keyboard.press('Enter')
  const opening = GAME_START_TUNE.slice(0, 4).map((n) => n.frequency)
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __played: number[] }).__played)).slice(0, 4)).toEqual(opening)
})
