import { type Page } from '@playwright/test'
import { GAME_START_TUNE, TITLE_TUNE } from '../../../src/engine/tunes'

// The original's tunes. Oscillators are recorded through a wrapped
// AudioContext, since the test cannot listen: each started note's frequency,
// and how many notes were cut short.

interface Recorded {
  played: number[]
  cut: number
}

// With holdSoundUntilGesture, the audio device behaves as Chrome's autoplay
// policy makes it on a first visit: suspended, and resume() never settles,
// until the page has had a click or a key.
export async function recordTones(page: Page, holdSoundUntilGesture = false): Promise<void> {
  await page.addInitScript((hold) => {
    const recorded = { played: [] as number[], cut: 0 }
    ;(window as unknown as { __recorded: typeof recorded }).__recorded = recorded
    const Original = window.AudioContext
    const gestured = () => !hold || navigator.userActivation.hasBeenActive
    window.AudioContext = class extends Original {
      get state(): AudioContextState {
        return gestured() ? super.state : 'suspended'
      }
      resume(): Promise<void> {
        return gestured() ? super.resume() : new Promise(() => {})
      }
      createOscillator(): OscillatorNode {
        const osc = super.createOscillator()
        const start = osc.start.bind(osc)
        const stop = osc.stop.bind(osc)
        osc.start = (when?: number) => { recorded.played.push(Math.round(osc.frequency.value * 10) / 10); start(when) }
        osc.stop = (when?: number) => { if (when === undefined) recorded.cut++; stop(when) }
        return osc
      }
    }
  }, holdSoundUntilGesture)
}

export function recorded(page: Page): Promise<Recorded> {
  return page.evaluate(() => (window as unknown as { __recorded: Recorded }).__recorded)
}

export function containsRun(tones: number[], run: number[]): boolean {
  return tones.some((_, i) => run.every((f, j) => tones[i + j] === f))
}

export const titleOpening = TITLE_TUNE.slice(0, 6).map((n) => n.frequency)
export const startOpening = GAME_START_TUNE.slice(0, 4).map((n) => n.frequency)

export async function openTitle(page: Page, holdSoundUntilGesture = false): Promise<void> {
  await recordTones(page, holdSoundUntilGesture)
  await page.goto('/')
  await page.waitForFunction(() => '__dbg' in window)
}
