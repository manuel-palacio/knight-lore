import { describe, it, expect } from 'vitest'
import { Sparkle, type SparkleEvent } from '../../src/game/Sparkle'
import { runFrames } from './frames'

function eventsOver(sparkle: Sparkle, frames: number): SparkleEvent[] {
  const events: SparkleEvent[] = []
  const recorder = { update: () => { const e = sparkle.update(); if (e) events.push(e) } }
  runFrames(recorder, frames)
  return events
}

// The stars he dissolves into and comes back out of: graphics 0x78-0x7F
// (handler 0xBEFE, a step every other frame) and 0x70-0x77 (0xBF2B, a step a frame).
describe('Sparkle', () => {
  it('is idle until he loses a life', () => {
    const sparkle = new Sparkle()
    expect(sparkle.phase).toBe('idle')
    expect(eventsOver(sparkle, 10)).toEqual([])
  })

  it('grows from 0x78 to 0x7F a step every other frame, then has dissolved', () => {
    const sparkle = new Sparkle()
    sparkle.dissolve()
    expect(sparkle.graphic).toBe(0x78)
    const events = eventsOver(sparkle, 16)
    expect(events.filter((e) => e.kind === 'step').map((e) => e.graphic)).toEqual([0x79, 0x7a, 0x7b, 0x7c, 0x7d, 0x7e, 0x7f])
    expect(events.at(-1)).toEqual({ kind: 'dissolved' })
    expect(sparkle.phase).toBe('idle')
  })

  it('shrinks from 0x70 to 0x77 a step a frame, then he is back', () => {
    const sparkle = new Sparkle()
    sparkle.rematerialise()
    const events = eventsOver(sparkle, 8)
    expect(events.filter((e) => e.kind === 'step').map((e) => e.graphic)).toEqual([0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77])
    expect(events.at(-1)).toEqual({ kind: 'rematerialised' })
  })

  it('draws the stars thin to thick as he dissolves and thick to thin as he comes back', () => {
    const growing = new Sparkle()
    growing.dissolve()
    expect(cellsSeen(growing, 16)).toEqual([0, 1, 2, 3, 4, 5, 4, 5])
    const shrinking = new Sparkle()
    shrinking.rematerialise()
    expect(cellsSeen(shrinking, 8)).toEqual([5, 4, 5, 4, 3, 2, 1, 0])
  })
})

// The strip cells drawn, frame by frame, a cell held over several frames counted once.
function cellsSeen(sparkle: Sparkle, frames: number): number[] {
  const seen = [sparkle.starCell]
  runFrames({ update: () => { sparkle.update(); if (sparkle.phase !== 'idle') seen.push(sparkle.starCell) } }, frames)
  return seen.filter((cell, i) => i === 0 || cell !== seen[i - 1])
}
