import { describe, it, expect } from 'vitest'
import { FloatingBlock } from '../../src/game/FloatingBlock'

describe('FloatingBlock', () => {
  // A block hanging with its underside two blocks up, as the original's
  // stepping stones and lintels do.
  const block = () => new FloatingBlock(3, 2, 2, 2)

  it('holds whoever lands on it, from above', () => {
    expect(block().supportAt(7, 5, 3)).toBe(3)
  })

  it('can be walked under, and is nothing to someone below it', () => {
    expect(block().supportAt(7, 5, 0)).toBeNull()
  })

  it('holds only over its own cell', () => {
    expect(block().supportAt(9.5, 5, 3)).toBeNull()
  })
})
