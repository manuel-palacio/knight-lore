import { describe, it, expect } from 'vitest'
import { CAULDRON_TOP, CHARM_OVER_CAULDRON, Cauldron, charmOverCauldron } from '../../src/game/Cauldron'
import { Wizard } from '../../src/game/Wizard'
import { blockFillsAt } from '../../src/game/BlockSolids'

describe('Cauldron', () => {
  it('is a box two blocks high and 20 pixels across (0x8D: w 10, h 24), stood on like a block', () => {
    const c = new Cauldron(8, 8)
    expect(CAULDRON_TOP).toBe(2)
    expect(c.supportAt(8, 8, 2)).toBe(2)
    expect(c.supportAt(9.2, 6.8, 2)).toBe(2)
    expect(c.supportAt(9.3, 8, 2)).toBeNull()
    expect(c.supportAt(8, 8, 0)).toBeNull()
  })

  it('he cannot walk through the cauldron or the wizard', () => {
    expect(blockFillsAt([new Cauldron(8, 8)], 8, 8, 0, 2)).toBe(true)
    expect(blockFillsAt([new Wizard(11, 11)], 11, 11, 0, 2)).toBe(true)
    expect(blockFillsAt([new Cauldron(8, 8)], 8, 8, 2, 4)).toBe(false)
  })

  it('the charm it wants hangs over it, 32 pixels up, only while he is a man', () => {
    expect(charmOverCauldron('goblet', 'human')).toBe('goblet')
    expect(charmOverCauldron('goblet', 'werewolf')).toBeNull()
    expect(charmOverCauldron(null, 'human')).toBeNull()
    expect(CHARM_OVER_CAULDRON).toBeCloseTo(32 / 12)
  })
})
