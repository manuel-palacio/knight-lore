import { describe, it, expect } from 'vitest'
import { JUMP_EFFECT, PICK_UP_EFFECT, SEIZURE_BEAT, deliveryEffect, dissolveEffect, pushEffect, rematerialiseEffect, seizureEffect } from '../../src/engine/effects'

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

describe('dissolveEffect (0xB419)', () => {
  it('sweeps single cycles down from the graphic rotated left twice, low five bits, bits 0-1 set', () => {
    // 0x79 rotated left twice is 0xE5; its low five bits 0x05, with 0x03: 7 cycles.
    const notes = dissolveEffect(0x79)
    expect(notes).toHaveLength(7)
    // c = 7 first: 7 rotated left twice is 0x1C.
    expect(notes[0]!.frequency).toBeCloseTo(1 / period(0x1c), 6)
    expect(notes[6]!.frequency).toBeCloseTo(1 / period(0x04), 6)
  })
})

describe('rematerialiseEffect (0xB403)', () => {
  it('plays two cycles at each ROM byte from 0x1234, as many as the graphic complemented has in its low five bits', () => {
    // ~0x71 & 0x1F = 0x0E: fourteen bytes, the first 0xFB.
    const notes = rematerialiseEffect(0x71)
    expect(notes).toHaveLength(14)
    expect(notes[0]!.frequency).toBeCloseTo(1 / period(0xfb), 6)
    expect(notes[0]!.duration).toBeCloseTo(2 * period(0xfb), 9)
    expect(rematerialiseEffect(0x77)).toHaveLength(8)
  })
})

describe('JUMP_EFFECT (0xB441)', () => {
  it('plays 32 single cycles, the counter 32 down to 1 turned five bits right', () => {
    expect(JUMP_EFFECT).toHaveLength(32)
    // 32 turned five right is 1; 31 is 0xF8; 1 is 8.
    expect(JUMP_EFFECT[0]!.frequency).toBeCloseTo(1 / period(1), 3)
    expect(JUMP_EFFECT[1]!.frequency).toBeCloseTo(1 / period(0xf8), 6)
    expect(JUMP_EFFECT[31]!.frequency).toBeCloseTo(1 / period(8), 6)
  })
})

describe('PICK_UP_EFFECT (0xB4A3)', () => {
  it('plays sixteen cycles at pitch 0x80', () => {
    expect(PICK_UP_EFFECT).toEqual([{ frequency: 1 / period(0x80), duration: 16 * period(0x80) }])
  })
})

describe('deliveryEffect (0xC2A5)', () => {
  it('flashes sixteen times, each a burst of the ROM bytes and a pause', () => {
    // The gem is graphic 0x60, 0x68 once in the cauldron: ~0x68 & 0x1F = 23 bytes.
    const notes = deliveryEffect('gem')
    expect(notes).toHaveLength(16 * (23 + 1))
    expect(notes[0]!.frequency).toBeCloseTo(1 / period(0xfb), 6)
    expect(notes[23]!.frequency).toBe(0)
  })

  it('bursts differently for each charm', () => {
    expect(deliveryEffect('gem').length).not.toBe(deliveryEffect('boot').length)
  })
})

describe('seizureEffect (0xB472)', () => {
  it('sweeps (c xor 0x55) + c for c down from 16, 24, 32 or 40 by pose, one beat each', () => {
    const notes = seizureEffect([0])
    // Pose 0: sixteen cycles, the first at (16 xor 0x55) + 16 = 0x55, then the rest of the beat silent.
    expect(notes).toHaveLength(17)
    expect(notes[0]!.frequency).toBeCloseTo(1 / period(0x55), 6)
    expect(notes.reduce((t, n) => t + n.duration, 0)).toBeCloseTo(SEIZURE_BEAT, 9)
    expect(seizureEffect([3])).toHaveLength(41)
  })
})
