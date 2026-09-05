import { describe, it, expect } from 'vitest'
import { selectCharacterFrame } from '../../src/game/CharacterFrame'

describe('selectCharacterFrame', () => {
  it('uses the front strip unflipped when facing east (screen down-right)', () => {
    expect(selectCharacterFrame('east', 0, false)).toEqual({ view: 'front', frame: 0, flip: false })
  })

  it('mirrors the front strip when facing south (screen down-left)', () => {
    expect(selectCharacterFrame('south', 0, false)).toEqual({ view: 'front', frame: 0, flip: true })
  })

  it('uses the back strip unflipped when facing west (screen up-left)', () => {
    expect(selectCharacterFrame('west', 0, false)).toEqual({ view: 'back', frame: 0, flip: false })
  })

  it('mirrors the back strip when facing north (screen up-right)', () => {
    expect(selectCharacterFrame('north', 0, false)).toEqual({ view: 'back', frame: 0, flip: true })
  })

  it('cycles stand, stride A, stride B, stride A while walking', () => {
    const frames = [0, 1, 2, 3, 4].map((step) => selectCharacterFrame('east', step, true).frame)
    expect(frames).toEqual([0, 1, 2, 1, 0])
  })

  it('shows stride A while airborne, whatever the step count', () => {
    expect(selectCharacterFrame('east', 0, false, true).frame).toBe(1)
    expect(selectCharacterFrame('west', 3, true, true).frame).toBe(1)
  })

  it('shows the standing frame when not walking regardless of step count', () => {
    expect(selectCharacterFrame('east', 3, false).frame).toBe(0)
  })
})
