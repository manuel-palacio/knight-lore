import { describe, it, expect } from 'vitest'
import { TransformSequence, TRANSFORM_DURATION } from '../../src/game/characters/TransformSequence'

function runFlips(seq: TransformSequence, from: number, to: number, step = 1 / 120): number {
  // counts visibility flips in the window (from, to]; assumes seq starts at t=0
  let flips = 0
  let last: boolean | null = null
  let t = 0
  while (t < to) {
    const frame = seq.update(step)
    t += step
    if (t > from && last !== null && frame.showTarget !== last) flips++
    if (t > from) last = frame.showTarget
    else last = frame.showTarget
  }
  return flips
}

describe('TransformSequence', () => {
  it('lasts TRANSFORM_DURATION and then reports done', () => {
    const seq = new TransformSequence('werewolf')
    let frame = seq.update(TRANSFORM_DURATION - 0.05)
    expect(frame.done).toBe(false)
    frame = seq.update(0.1)
    expect(frame.done).toBe(true)
  })

  it('ends showing the target form', () => {
    const seq = new TransformSequence('werewolf')
    const frame = seq.update(TRANSFORM_DURATION + 0.01)
    expect(frame.showTarget).toBe(true)
    expect(frame.jitterScale.x).toBe(1)
    expect(frame.jitterTilt).toBe(0)
  })

  it('flickers faster toward the end (accelerating flips)', () => {
    const firstHalf = runFlips(new TransformSequence('werewolf'), 0, TRANSFORM_DURATION / 2)
    const secondHalf = runFlips(new TransformSequence('werewolf'), TRANSFORM_DURATION / 2, TRANSFORM_DURATION)
    expect(secondHalf).toBeGreaterThan(firstHalf)
  })

  it('applies asymmetric jitter while running', () => {
    const seq = new TransformSequence('werewolf')
    const frame = seq.update(0.3)
    const { x, y, z } = frame.jitterScale
    expect(x === y && y === z).toBe(false)
  })

  it('restart resets the clock and retargets', () => {
    const seq = new TransformSequence('werewolf')
    seq.update(0.8)
    seq.restart('human')
    expect(seq.target).toBe('human')
    const frame = seq.update(0.1)
    expect(frame.done).toBe(false)
  })
})
