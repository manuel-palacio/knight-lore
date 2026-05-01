import { describe, it, expect } from 'vitest'
import { GameState } from '../../src/game/GameState'
import { Door } from '../../src/game/Door'

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

describe('Door', () => {
  it('opens exactly once when condition becomes true', () => {
    const state = new GameState()
    const door = new Door('south', () => state.hasItem('goblet'))
    let openedCount = 0
    door.onOpen = () => { openedCount++ }

    door.update(1 / 60, { state })
    expect(door.open).toBe(false)
    expect(openedCount).toBe(0)

    state.addItem('goblet')
    door.update(1 / 60, { state })
    expect(door.open).toBe(true)
    expect(openedCount).toBe(1)

    door.update(1 / 60, { state })
    expect(openedCount).toBe(1)
  })
})
