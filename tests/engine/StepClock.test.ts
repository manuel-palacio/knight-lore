import { describe, it, expect } from 'vitest'
import { FrameClock, STEP_LENGTH, TICKS_PER_FRAME, TICKS_PER_STEP } from '../../src/engine/StepClock'

describe('FrameClock', () => {
  it("keeps the original's pace against Sabreman: he walks three pixels a frame (0xCA3D), two a step here", () => {
    const pixelsPerUnit = 8
    expect(STEP_LENGTH * pixelsPerUnit * (TICKS_PER_FRAME / TICKS_PER_STEP)).toBe(3)
  })

  it('ticks a frame every seven and a half ticks: on ticks 8, 15, 23 and 30', () => {
    const clock = new FrameClock()
    const frames = Array.from({ length: 30 }, (_, i) => (clock.tick() ? i + 1 : 0)).filter(Boolean)
    expect(frames).toEqual([8, 15, 23, 30])
  })
})
