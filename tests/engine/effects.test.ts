import { describe, it, expect } from 'vitest'
import { pushEffect } from '../../src/engine/effects'

// One beeper cycle at pitch B (0xB4ED) takes 26·B + 82 T-states at 3.5 MHz.
const period = (b: number) => (26 * b + 82) / 3_500_000

describe('pushEffect (0xB467)', () => {
  it('plays six cycles at a pitch from where the box is: x + y + z, complemented, rotated left twice', () => {
    // A table in cell (6, 2) of a full room, on the floor: the original's
    // x 0x48 + 6·16 = 0xA8, y 0x48 + (7 − 2)·16 = 0x98, z 0x80.
    // 0xA8 + 0x98 + 0x80 = 0x1C0 → 0xC0 → complemented 0x3F → 0xFC.
    const [note, ...rest] = pushEffect({ x: 13, y: 0, z: 5 }, { width: 8, depth: 8 })
    expect(rest).toEqual([])
    expect(note!.frequency).toBeCloseTo(1 / period(0xfc), 6)
    expect(note!.duration).toBeCloseTo(6 * period(0xfc), 9)
  })

  it('changes pitch as the box slides, the glide of the original', () => {
    const pitches = [13, 13.375, 13.75, 14.125].map((x) => pushEffect({ x, y: 0, z: 5 }, { width: 8, depth: 8 })[0]!.frequency)
    expect(new Set(pitches).size).toBe(pitches.length)
  })
})
