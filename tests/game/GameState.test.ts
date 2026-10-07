import { describe, it, expect } from 'vitest'
import { GameState, CURE_LENGTH, HUMAN_DURATION, WEREWOLF_DURATION, DUSK_WARNING, CURE_ORDER, DEALT_ITEMS, isCompatibleSave, itemAtSpot, type ItemId, type SavedGame } from '../../src/game/GameState'

describe('GameState', () => {
  it('starts as human with full timer', () => {
    const s = new GameState()
    expect(s.form).toBe('human')
    expect(s.transformTimer).toBe(HUMAN_DURATION)
    expect(s.won).toBe(false)
  })

  it('a day and a night each last 392 of the original\'s frames (0xC397: 49 steps of 8), 49 s at its eight a second', () => {
    expect(HUMAN_DURATION).toBe(49)
    expect(WEREWOLF_DURATION).toBe(HUMAN_DURATION)
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
  })

  it('asks for the original\'s fourteen charms (0xC27D) in its order, read round from a seeded start', () => {
    expect(CURE_LENGTH).toBe(14)
    expect(CURE_ORDER).toEqual(['gem', 'poison', 'boot', 'goblet', 'teacup', 'wine-bottle', 'crystal-ball',
      'goblet', 'wine-bottle', 'gem', 'crystal-ball', 'poison', 'boot', 'teacup'])
    const starts = new Set<number>()
    for (const seed of [1, 2, 3, 7, 8, 99, 12345]) {
      const cure = new GameState(seed).cureSequence
      const start = CURE_ORDER.indexOf(cure[0]!)
      const rotations = CURE_ORDER.map((_, r) => [...CURE_ORDER.slice(r), ...CURE_ORDER.slice(0, r)])
      expect(rotations).toContainEqual(cure)
      expect(new GameState(seed).cureSequence).toEqual(cure)
      starts.add(start)
    }
    expect(starts.size).toBeGreaterThan(1)
  })

  it('wantedItem walks the cure sequence as items are delivered', () => {
    const s = new GameState()
    const [first, second] = s.cureSequence
    expect(s.wantedItem).toBe(first)
    expect(s.deliverCureItem(first!)).toBe(true)
    expect(s.cureProgress).toBe(1)
    expect(s.wantedItem).toBe(second)
  })

  it('a wrong charm does not go towards the cure; the wanted one does, from the wolf too (0xC245)', () => {
    const s = new GameState()
    const wanted = s.cureSequence[0]
    const other = s.cureSequence.find((charm) => charm !== wanted)
    expect(s.deliverCureItem(other!)).toBe(false)
    expect(s.cureProgress).toBe(0)
    s.toggleForm() // werewolf
    expect(s.deliverCureItem(wanted!)).toBe(true)
    expect(s.cureProgress).toBe(1)
  })

  it('delivering every item in order wins and wantedItem becomes null', () => {
    const s = new GameState()
    for (const id of s.cureSequence) {
      expect(s.deliverCureItem(id)).toBe(true)
    }
    expect(s.won).toBe(true)
    expect(s.wantedItem).toBeNull()
  })
})


describe('the charms dealt round the castle (0xC47E)', () => {
  it('deals from one of eight starts, fixed by the seed', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const deal = new GameState(seed).charmDeal
      expect(deal).toBeGreaterThanOrEqual(0)
      expect(deal).toBeLessThan(8)
      expect(new GameState(seed).charmDeal).toBe(deal)
    }
  })

  it('gives each spot the next of the eight kinds, in graphic order from 0x60, round and round', () => {
    expect(DEALT_ITEMS).toEqual(['gem', 'poison', 'boot', 'goblet', 'teacup', 'wine-bottle', 'crystal-ball', 'life'])
    expect([0, 1, 2, 7, 8, 31].map((spot) => itemAtSpot(spot, 0))).toEqual(['gem', 'poison', 'boot', 'life', 'gem', 'life'])
    expect(itemAtSpot(26, 6)).toBe(DEALT_ITEMS[(6 + 26) & 7])
  })

  // The eight distribution tables A-H players know (Evercade's guide to the
  // game): which kind lies in the rooms of each of eight groups, numbered 1-8.
  it('deals as the players\' tables A-H have it: each table one of the eight deals', () => {
    const TABLES: ItemId[][] = [
      ['crystal-ball', 'life', 'poison', 'wine-bottle', 'goblet', 'boot', 'gem', 'teacup'],
      ['wine-bottle', 'crystal-ball', 'gem', 'teacup', 'boot', 'poison', 'life', 'goblet'],
      ['goblet', 'teacup', 'crystal-ball', 'boot', 'gem', 'life', 'wine-bottle', 'poison'],
      ['life', 'gem', 'boot', 'crystal-ball', 'teacup', 'goblet', 'poison', 'wine-bottle'],
      ['poison', 'boot', 'teacup', 'gem', 'crystal-ball', 'wine-bottle', 'goblet', 'life'],
      ['boot', 'goblet', 'wine-bottle', 'poison', 'life', 'crystal-ball', 'teacup', 'gem'],
      ['teacup', 'wine-bottle', 'life', 'goblet', 'poison', 'gem', 'crystal-ball', 'boot'],
      ['gem', 'poison', 'goblet', 'life', 'wine-bottle', 'teacup', 'boot', 'crystal-ball'],
    ]
    // Group n's spots are those whose number is n's, eight apart: table A is some deal.
    const groupOf = TABLES[0]!.map((item) => DEALT_ITEMS.indexOf(item))
    const deals = TABLES.map((table) => {
      const deal = [0, 1, 2, 3, 4, 5, 6, 7].find((d) => table.every((item, n) => itemAtSpot(groupOf[n]!, d) === item))
      expect(deal, table.join()).toBeDefined()
      return deal
    })
    expect(new Set(deals).size).toBe(8)
  })

  it('keeps where and which way he came into the room through a save and continue', () => {
    const state = new GameState(7)
    state.entry = { x: 1, z: 8, facing: 'east' }
    expect(GameState.restore(state.serialize()).entry).toEqual({ x: 1, z: 8, facing: 'east' })
  })

  it('keeps the deal and the spots used up through a save and continue', () => {
    const state = new GameState(7)
    state.usedSpots.push(26)
    const back = GameState.restore(state.serialize())
    expect(back.charmDeal).toBe(state.charmDeal)
    expect(back.usedSpots).toEqual([26])
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

  it('rejects a save from before it kept where he came in', () => {
    const old: Partial<SavedGame> = { ...new GameState(3).serialize() }
    delete old.entry
    expect(isCompatibleSave(old as SavedGame)).toBe(false)
  })

  it('rejects a save from before the charms were dealt round the original\'s spots', () => {
    const old: Partial<SavedGame> = { ...new GameState(3).serialize() }
    delete old.charmDeal
    expect(isCompatibleSave(old as SavedGame)).toBe(false)
  })

  it('rejects a save from the eight-charm version, whose cure asked for the extra life', () => {
    const old = { ...new GameState(3).serialize(), cureSequence: ['goblet', 'gem', 'wine-bottle', 'crystal-ball', 'boot', 'teacup', 'poison', 'life'] }
    expect(isCompatibleSave(old)).toBe(false)
  })
})

describe('GameState end summary', () => {
  it('counts the rooms he has been in, and keeps them in a save', () => {
    const state = new GameState(1)
    for (const id of ['a', 'b', 'a', 'c']) state.visitedRooms.add(id)
    expect(state.summary).toMatchObject({ days: 1, charms: 0, rating: 'POOR' })
    expect(GameState.restore(state.serialize()).visitedRooms).toEqual(new Set(['a', 'b', 'c']))
  })

  it('shows at most the forty days, and rates a win four places up', () => {
    const state = new GameState(1)
    state.dayCount = 41
    state.won = true
    for (let i = 0; i < 40; i++) state.visitedRooms.add(`room-${i}`)
    expect(state.summary).toMatchObject({ days: 40, rating: 'MARVELLOUS' })
  })
})
