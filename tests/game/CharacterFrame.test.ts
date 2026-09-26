import { describe, it, expect } from 'vitest'
import { selectCharacterFrame, STRIP_CELLS } from '../../src/game/CharacterFrame'

describe('selectCharacterFrame', () => {
  it('uses the front strip unflipped when facing east (screen down-right)', () => {
    expect(selectCharacterFrame('east', 0, false)).toEqual({ view: 'front', frame: 2, flip: false })
  })

  it('mirrors the front strip when facing south (screen down-left)', () => {
    expect(selectCharacterFrame('south', 0, false)).toEqual({ view: 'front', frame: 2, flip: true })
  })

  it('uses the back strip unflipped when facing west (screen up-left)', () => {
    expect(selectCharacterFrame('west', 0, false)).toEqual({ view: 'back', frame: 2, flip: false })
  })

  it('mirrors the back strip when facing north (screen up-right)', () => {
    expect(selectCharacterFrame('north', 0, false)).toEqual({ view: 'back', frame: 2, flip: true })
  })

  it('has four frames per view for both forms, as the original strips do', () => {
    expect(STRIP_CELLS).toEqual({ human: 4, werewolf: 4 })
  })

  it('walks both forms through the original six-step cycle, 0 1 2 3 2 1', () => {
    for (const form of ['human', 'werewolf'] as const) {
      const frames = [0, 1, 2, 3, 4, 5, 6].map((step) => selectCharacterFrame('east', step, true, false, form).frame)
      expect(frames, form).toEqual([0, 1, 2, 3, 2, 1, 0])
    }
  })

  it('stands in the feet-together pose of each form', () => {
    expect(selectCharacterFrame('east', 5, false, false, 'human').frame).toBe(2)
    expect(selectCharacterFrame('east', 5, false, false, 'werewolf').frame).toBe(1)
  })

  it('shows the widest stride while airborne, whatever the step count', () => {
    expect(selectCharacterFrame('east', 0, false, true).frame).toBe(0)
    expect(selectCharacterFrame('west', 3, true, true).frame).toBe(0)
  })

  it('shows the standing frame when not walking regardless of step count', () => {
    expect(selectCharacterFrame('east', 3, false).frame).toBe(2)
  })
})
