import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'

describe('Grid', () => {
  it('initializes an empty W×D grid with all cells passable', () => {
    const g = new Grid(8, 8)
    expect(g.width).toBe(8)
    expect(g.depth).toBe(8)
    expect(g.isSolid(0, 0)).toBe(false)
    expect(g.isSolid(7, 7)).toBe(false)
  })

  it('marks cells as solid', () => {
    const g = new Grid(4, 4)
    g.setSolid(2, 3, true)
    expect(g.isSolid(2, 3)).toBe(true)
    expect(g.isSolid(2, 2)).toBe(false)
  })

  it('tracks support surface separately from solid', () => {
    const g = new Grid(4, 4)
    g.setSupport(1, 1, 1.6)
    expect(g.supportHeight(1, 1)).toBe(1.6)
    expect(g.supportHeight(0, 0)).toBe(0)
  })

  it('out-of-bounds cells are treated as solid (room walls)', () => {
    const g = new Grid(4, 4)
    expect(g.isSolid(-1, 0)).toBe(true)
    expect(g.isSolid(0, -1)).toBe(true)
    expect(g.isSolid(4, 0)).toBe(true)
    expect(g.isSolid(0, 4)).toBe(true)
  })

  it('clears occupant', () => {
    const g = new Grid(4, 4)
    const obj = { id: 'block' }
    g.setOccupant(2, 2, obj)
    expect(g.occupant(2, 2)).toBe(obj)
    g.setOccupant(2, 2, null)
    expect(g.occupant(2, 2)).toBe(null)
  })
})
