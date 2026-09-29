import { describe, it, expect } from 'vitest'
import { blockFillsAt } from '../../src/game/BlockSolids'
import { FloatingBlock } from '../../src/game/FloatingBlock'

describe('blockFillsAt', () => {
  it('finds a floating block over its cell between its underside and its top, and nowhere else', () => {
    const block = new FloatingBlock(2, 3, 1, 2) // cell (2, 3): x 4 to 6, z 6 to 8, level 1 to 2
    expect(blockFillsAt([block], 5, 7, 0.1, 1.6)).toBe(true)
    expect(blockFillsAt([block], 5, 7, 0, 0.9)).toBe(false) // under it
    expect(blockFillsAt([block], 5, 7, 2, 3.6)).toBe(false) // on it
    expect(blockFillsAt([block], 7, 7, 0.1, 1.6)).toBe(false) // beside it
  })
})
