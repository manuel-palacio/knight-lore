import { describe, it, expect } from 'vitest'
import { GameState, CHARMS, CURE_LENGTH, HUMAN_DURATION, WEREWOLF_DURATION, DUSK_WARNING, isCompatibleSave } from '../../src/game/GameState'

describe('GameState', () => {
  it('starts as human with full timer and empty inventory', () => {
    const s = new GameState()
    expect(s.form).toBe('human')
    expect(s.transformTimer).toBe(HUMAN_DURATION)
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
    expect(s.transformTimer).toBe(WEREWOLF_DURATION)
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
    s.tickTransform(HUMAN_DURATION + 0.1) // human -> werewolf
    expect(s.dayCount).toBe(1)
    s.tickTransform(WEREWOLF_DURATION + 0.1) // werewolf -> human: day completed
    expect(s.dayCount).toBe(2)
  })

  it('game over after day 40 expires', () => {
    const s = new GameState()
    for (let day = 0; day < 40; day++) {
      s.tickTransform(HUMAN_DURATION + 0.1)
      s.tickTransform(WEREWOLF_DURATION + 0.1)
    }
    expect(s.dayCount).toBe(41)
    expect(s.gameOver).toBe(true)
    expect(s.gameOverReason).toBe('days')
  })

  it('reports day progress from 0 at dawn to 1 at dusk and resets on transform', () => {
    const s = new GameState()
    expect(s.dayProgress).toBe(0)
    s.tickTransform(HUMAN_DURATION / 2)
    expect(s.dayProgress).toBeCloseTo(0.5, 5)
    s.tickTransform(HUMAN_DURATION / 2 + 0.001)
    expect(s.form).toBe('werewolf')
    expect(s.dayProgress).toBeCloseTo(0, 2)
  })

  it('flags dusk during the last seconds before a transform', () => {
    const s = new GameState()
    expect(s.isDusk).toBe(false)
    s.tickTransform(HUMAN_DURATION - DUSK_WARNING + 0.01)
    expect(s.isDusk).toBe(true)
  })

  it('serialises and restores the whole run: day, lives, form, timer, sequence, progress, room', () => {
    const s = new GameState(3)
    s.tickTransform(HUMAN_DURATION + 0.01)
    s.loseLife()
    s.currentRoomId = 'room-009'
    const wanted = s.cureSequence[0]!
    s.addItem(wanted)
    s.toggleForm()
    s.deliverCureItem(wanted)
    const restored = GameState.restore(s.serialize())
    expect(restored.dayCount).toBe(s.dayCount)
    expect(restored.lives).toBe(s.lives)
    expect(restored.form).toBe(s.form)
    expect(restored.transformTimer).toBeCloseTo(s.transformTimer, 5)
    expect(restored.cureSequence).toEqual(s.cureSequence)
    expect(restored.cureProgress).toBe(1)
    expect(restored.currentRoomId).toBe('room-009')
    expect(restored.inventory).toEqual([])
  })

  it('draws a cure of fourteen charms, each of the seven kinds twice, in a seeded random order', () => {
    const a = new GameState(7)
    const b = new GameState(7)
    const c = new GameState(8)
    expect(CURE_LENGTH).toBe(14)
    expect(a.cureSequence).toHaveLength(CURE_LENGTH)
    for (const charm of CHARMS) expect(a.cureSequence.filter((i) => i === charm), charm).toHaveLength(2)
    expect(a.cureSequence).not.toContain('life')
    expect(a.cureSequence).toEqual(b.cureSequence)
    expect(c.cureSequence).not.toEqual(a.cureSequence)
  })

  it('wantedItem walks the cure sequence as items are delivered', () => {
    const s = new GameState()
    const [first, second] = s.cureSequence
    expect(s.wantedItem).toBe(first)
    s.addItem(first!)
    expect(s.deliverCureItem(first!)).toBe(true)
    expect(s.cureProgress).toBe(1)
    expect(s.wantedItem).toBe(second)
    expect(s.hasItem(first!)).toBe(false)
  })

  it('rejects wrong item, empty hands, and werewolf deliveries', () => {
    const s = new GameState()
    const [wanted, other] = s.cureSequence
    s.addItem(other!)
    expect(s.deliverCureItem(other!)).toBe(false)
    expect(s.deliverCureItem(null)).toBe(false)
    s.removeItem(other!)
    s.addItem(wanted!)
    s.toggleForm() // werewolf
    expect(s.deliverCureItem(wanted!)).toBe(false)
    expect(s.cureProgress).toBe(0)
  })

  it('delivering every item in order wins and wantedItem becomes null', () => {
    const s = new GameState()
    for (const id of s.cureSequence) {
      s.addItem(id)
      expect(s.deliverCureItem(id)).toBe(true)
    }
    expect(s.won).toBe(true)
    expect(s.wantedItem).toBeNull()
  })
})


describe('GameState.deliveredCount', () => {
  it('counts how many of a kind of charm the cauldron has taken', () => {
    const state = new GameState(7)
    const first = state.cureSequence[0]!
    expect(state.deliveredCount(first)).toBe(0)
    state.deliverCureItem(first)
    expect(state.deliveredCount(first)).toBe(1)
  })
})

describe('GameState.gainLife', () => {
  it('adds a life', () => {
    const state = new GameState(7)
    const before = state.lives
    state.gainLife()
    expect(state.lives).toBe(before + 1)
  })
})

describe('isCompatibleSave', () => {
  it('accepts a save written by this version', () => {
    expect(isCompatibleSave(new GameState(3).serialize())).toBe(true)
  })

  it('rejects a save from the eight-charm version, whose cure asked for the extra life', () => {
    const old = { ...new GameState(3).serialize(), cureSequence: ['goblet', 'gem', 'wine-bottle', 'crystal-ball', 'boot', 'teacup', 'poison', 'life'] }
    expect(isCompatibleSave(old)).toBe(false)
  })
})
