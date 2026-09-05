import { describe, it, expect } from 'vitest'
import { SOUNDS, type SoundName } from '../../src/engine/Beeper'

const EXPECTED: SoundName[] = ['step', 'jump', 'land', 'pickup', 'drop', 'deliver', 'transform', 'hurt', 'door', 'win', 'wrong', 'day']

describe('beeper sound table', () => {
  it('defines every game sound as at least one audible note', () => {
    for (const name of EXPECTED) {
      const notes = SOUNDS[name]
      expect(notes.length, name).toBeGreaterThan(0)
      for (const n of notes) {
        expect(n.frequency, name).toBeGreaterThan(20)
        expect(n.duration, name).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the footstep tick short so it never overlaps the next step', () => {
    const total = SOUNDS.step.reduce((sum, n) => sum + n.duration, 0)
    expect(total).toBeLessThan(1 / 12)
  })
})
