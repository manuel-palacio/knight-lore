import { describe, it, expect } from 'vitest'
import { seizurePoses } from '../../src/view/CharacterLook'
import { SEIZURE_BEAT } from '../../src/engine/effects'

describe('the seizure (0xC357)', () => {
  it('is eight beats of four frames: 32 frames, 1.6 s at 20 a second', () => {
    expect(SEIZURE_BEAT).toBeCloseTo(0.2, 9)
    expect(seizurePoses()).toHaveLength(8)
  })

  it('draws one of the four poses a beat at random, never the one just drawn (0xC362)', () => {
    const poses = seizurePoses(() => 0.3)
    expect(poses.every((p) => p >= 0 && p < 4)).toBe(true)
    expect(poses).toEqual([1, 0, 1, 0, 1, 0, 1, 0])
  })
})
