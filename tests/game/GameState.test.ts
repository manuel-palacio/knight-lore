import { describe, it, expect } from 'vitest'
import { GameState } from '../../src/game/GameState'

describe('GameState', () => {
  it('starts as human with full timer and empty inventory', () => {
    const s = new GameState()
    expect(s.form).toBe('human')
    expect(s.transformTimer).toBe(20)
    expect(s.inventory).toEqual([])
    expect(s.won).toBe(false)
  })

  it('inventory.has() returns true after add', () => {
    const s = new GameState()
    s.addItem('goblet')
    expect(s.hasItem('goblet')).toBe(true)
  })

  it('inventory persists across simulated transformations', () => {
    const s = new GameState()
    s.addItem('goblet')
    s.toggleForm()
    expect(s.form).toBe('werewolf')
    expect(s.hasItem('goblet')).toBe(true)
    s.toggleForm()
    expect(s.hasItem('goblet')).toBe(true)
  })

  it('toggleForm resets timer based on new form', () => {
    const s = new GameState()
    s.toggleForm()
    expect(s.form).toBe('werewolf')
    expect(s.transformTimer).toBe(20)
  })
})
