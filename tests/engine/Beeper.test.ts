import { describe, it, expect } from 'vitest'
import { Beeper, SOUNDS, type SoundName } from '../../src/engine/Beeper'

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

describe('Beeper mute', () => {
  it('toggles, and while muted plays nothing, not even opening the audio device', () => {
    let opened = 0
    const original = (globalThis as Record<string, unknown>).AudioContext
    ;(globalThis as Record<string, unknown>).AudioContext = class { constructor() { opened++ } }
    try {
      const beeper = new Beeper()
      expect(beeper.toggleMute()).toBe(true)
      beeper.play('door')
      expect(opened).toBe(0)
      expect(beeper.toggleMute()).toBe(false)
    } finally {
      ;(globalThis as Record<string, unknown>).AudioContext = original
    }
  })
})
