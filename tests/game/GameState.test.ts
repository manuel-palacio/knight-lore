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

  it('starts with 5 lives, day 1, no game over', () => {
    const s = new GameState()
    expect(s.lives).toBe(5)
    expect(s.dayCount).toBe(1)
    expect(s.gameOver).toBe(false)
    expect(s.gameOverReason).toBeNull()
  })

  it('loseLife decrements and fires onLifeLost', () => {
    const s = new GameState()
    let fired = 0
    s.onLifeLost = () => fired++
    s.loseLife()
    expect(s.lives).toBe(4)
    expect(fired).toBe(1)
    expect(s.gameOver).toBe(false)
  })

  it('game over when lives reach 0', () => {
    const s = new GameState()
    for (let i = 0; i < 5; i++) s.loseLife()
    expect(s.lives).toBe(0)
    expect(s.gameOver).toBe(true)
    expect(s.gameOverReason).toBe('lives')
  })

  it('day advances when form returns to human (one full cycle)', () => {
    const s = new GameState()
    s.tickTransform(20.1) // human -> werewolf
    expect(s.dayCount).toBe(1)
    s.tickTransform(20.1) // werewolf -> human: day completed
    expect(s.dayCount).toBe(2)
  })

  it('game over after day 40 expires', () => {
    const s = new GameState()
    for (let day = 0; day < 40; day++) {
      s.tickTransform(20.1)
      s.tickTransform(20.1)
    }
    expect(s.dayCount).toBe(41)
    expect(s.gameOver).toBe(true)
    expect(s.gameOverReason).toBe('days')
  })

  it('wantedItem walks the cure sequence as items are delivered', () => {
    const s = new GameState()
    expect(s.wantedItem).toBe('goblet')
    s.addItem('goblet')
    expect(s.deliverCureItem('goblet')).toBe(true)
    expect(s.cureProgress).toBe(1)
    expect(s.wantedItem).toBe('gem')
    expect(s.hasItem('goblet')).toBe(false)
  })

  it('rejects wrong item, empty hands, and werewolf deliveries', () => {
    const s = new GameState()
    s.addItem('gem')
    expect(s.deliverCureItem('gem')).toBe(false) // wants goblet
    expect(s.deliverCureItem(null)).toBe(false)
    s.removeItem('gem')
    s.addItem('goblet')
    s.toggleForm() // werewolf
    expect(s.deliverCureItem('goblet')).toBe(false)
    expect(s.cureProgress).toBe(0)
  })

  it('delivering all 4 items wins and wantedItem becomes null', () => {
    const s = new GameState()
    for (const id of ['goblet', 'gem', 'wine-bottle', 'crystal-ball']) {
      s.addItem(id)
      expect(s.deliverCureItem(id)).toBe(true)
    }
    expect(s.won).toBe(true)
    expect(s.wantedItem).toBeNull()
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
