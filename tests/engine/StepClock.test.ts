import { describe, it, expect } from 'vitest'
import { FrameClock, STEP_LENGTH, TICKS_PER_FRAME, TICKS_PER_STEP } from '../../src/engine/StepClock'

describe('FrameClock', () => {
  it("keeps the original's pace against Sabreman: he walks three pixels a frame (0xCA3D), two a step here", () => {
    const pixelsPerUnit = 8
    expect(STEP_LENGTH * pixelsPerUnit * (TICKS_PER_FRAME / TICKS_PER_STEP)).toBe(3)
  })

  it('runs twenty frames a second, as the original does in an empty room (reference/recording.mov): a frame every third tick of 60', () => {
    const clock = new FrameClock()
    const frames = Array.from({ length: 60 }, (_, i) => (clock.tick() ? i + 1 : 0)).filter(Boolean)
    expect(frames).toHaveLength(20)
    expect(frames.slice(0, 3)).toEqual([3, 6, 9])
  })
})
