import { describe, it, expect } from 'vitest'
import { Beeper, SOUNDS, footstepSound, type SoundName } from '../../src/engine/Beeper'

const EXPECTED: SoundName[] = ['tick', 'ticky', 'gameStart', 'gameOver', 'jump', 'land', 'pickup', 'drop', 'deliver', 'transform', 'hurt', 'door', 'win', 'wrong', 'day']

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

  it('keeps each footstep short so it never overlaps the next step', () => {
    for (const name of ['tick', 'ticky'] as const) {
      const total = SOUNDS[name].reduce((sum, n) => sum + n.duration, 0)
      expect(total, name).toBeLessThan(1 / 12)
    }
  })
})

describe('Beeper mute', () => {
  it('toggles, and while muted plays nothing, not even opening the audio device', () => {
    let opened = 0
    const globals = globalThis as Record<string, unknown>
    const original = globals.AudioContext
    globals.AudioContext = class { constructor() { opened++ } }
    try {
      const beeper = new Beeper()
      expect(beeper.toggleMute()).toBe(true)
      beeper.play('door')
      expect(opened).toBe(0)
      expect(beeper.toggleMute()).toBe(false)
    } finally {
      globals.AudioContext = original
    }
  })
})

describe('footstepSound', () => {
  it('goes tick, ticky, ticky over each six-step walk cycle', () => {
    const cycle = [0, 1, 2, 3, 4, 5].map(footstepSound)
    expect(cycle).toEqual(['tick', null, 'ticky', null, 'ticky', null])
    expect(footstepSound(6)).toBe('tick')
  })

  it('makes the ticky a double click and both loud enough to hear', () => {
    expect(SOUNDS.tick).toHaveLength(1)
    expect(SOUNDS.ticky).toHaveLength(2)
    for (const n of [...SOUNDS.tick, ...SOUNDS.ticky]) expect(n.duration).toBeGreaterThanOrEqual(0.015)
  })
})

describe('the original tunes', () => {
  const seconds = (name: SoundName) => SOUNDS[name].reduce((sum, n) => sum + n.duration, 0)

  it('starts a game with the 9-note start tune', () => {
    expect(SOUNDS.gameStart).toHaveLength(9)
    expect(seconds('gameStart')).toBeCloseTo(2.5, 0)
  })

  it('ends a game with the 32-note results tune', () => {
    expect(SOUNDS.gameOver).toHaveLength(32)
    expect(seconds('gameOver')).toBeCloseTo(5, 0)
  })

  it('greets the brewed cure with the 25-note tune', () => {
    expect(SOUNDS.win).toHaveLength(25)
  })

  it('keeps every note in the beeper range', () => {
    for (const name of ['gameStart', 'gameOver', 'win'] as const) {
      for (const n of SOUNDS[name]) expect(n.frequency === 0 || (n.frequency > 100 && n.frequency < 2000), name).toBe(true)
    }
  })
})
