import { describe, it, expect } from 'vitest'
import { GameState, HUMAN_DURATION, WEREWOLF_DURATION } from '../../src/game/GameState'

describe('Werewolf transformation', () => {
  it('transforms when timer reaches zero', () => {
    const s = new GameState()
    let transformed = 0
    s.onTransformed = () => { transformed++ }
    s.tickTransform(HUMAN_DURATION + 0.001)
    expect(s.form).toBe('werewolf')
    expect(transformed).toBe(1)
    expect(s.transformTimer).toBe(WEREWOLF_DURATION)
  })

  it('emits PlayerTransformed exactly once per transformation', () => {
    const s = new GameState()
    let count = 0
    s.onTransformed = () => { count++ }
    for (let i = 0; i < HUMAN_DURATION * 60 + 10; i++) s.tickTransform(1 / 60)
    expect(s.form).toBe('werewolf')
    expect(count).toBe(1)
  })
})
