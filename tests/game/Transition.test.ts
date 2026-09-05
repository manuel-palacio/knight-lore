import { describe, it, expect } from 'vitest'
import { Transition } from '../../src/game/Transition'

describe('Transition wipe', () => {
  it('is inactive until started, then blocks input for its duration', () => {
    const wipe = new Transition(0.25)
    expect(wipe.active).toBe(false)
    wipe.start()
    expect(wipe.active).toBe(true)
    wipe.tick(0.1)
    expect(wipe.active).toBe(true)
    wipe.tick(0.2)
    expect(wipe.active).toBe(false)
  })

  it('stays black while the next room is still loading, even past its duration', () => {
    const wipe = new Transition(0.25)
    wipe.start()
    wipe.holdUntilLoaded()
    wipe.tick(1)
    expect(wipe.active).toBe(true)
    wipe.loaded()
    expect(wipe.active).toBe(false)
  })
})
