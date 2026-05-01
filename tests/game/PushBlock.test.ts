import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { PushBlock } from '../../src/game/PushBlock'
import { Category } from '../../src/engine/categories'

const TILE = 2

describe('PushBlock', () => {
  it('declares both SOLID_DYNAMIC and SUPPORT_SURFACE categories', () => {
    const b = new PushBlock(3, 3)
    expect(b.hasCategory(Category.SOLID_DYNAMIC)).toBe(true)
    expect(b.hasCategory(Category.SUPPORT_SURFACE)).toBe(true)
  })

  it('push succeeds when target tile is empty floor', () => {
    const grid = new Grid(8, 8)
    const b = new PushBlock(3, 3)
    b.placeOnGrid(grid, TILE)
    const ok = b.tryPush('east', grid, TILE)
    expect(ok).toBe(true)
    expect(b.gridX).toBe(4)
    expect(b.gridZ).toBe(3)
    expect(grid.occupant(3, 3)).toBe(null)
    expect(grid.occupant(4, 3)).toBe(b)
    expect(grid.isSolid(4, 3)).toBe(true)
    expect(grid.supportHeight(4, 3)).toBeGreaterThan(0)
  })

  it('push fails when target tile is solid wall', () => {
    const grid = new Grid(8, 8)
    grid.setSolid(4, 3, true)
    const b = new PushBlock(3, 3)
    b.placeOnGrid(grid, TILE)
    const ok = b.tryPush('east', grid, TILE)
    expect(ok).toBe(false)
    expect(b.gridX).toBe(3)
  })

  it('push fails when target tile holds another block', () => {
    const grid = new Grid(8, 8)
    const a = new PushBlock(3, 3)
    a.placeOnGrid(grid, TILE)
    const b = new PushBlock(4, 3)
    b.placeOnGrid(grid, TILE)
    const ok = a.tryPush('east', grid, TILE)
    expect(ok).toBe(false)
    expect(a.gridX).toBe(3)
  })

  it('block top is SUPPORT_SURFACE while at rest', () => {
    const grid = new Grid(8, 8)
    const b = new PushBlock(3, 3)
    b.placeOnGrid(grid, TILE)
    expect(b.moving).toBe(false)
    expect(grid.supportHeight(3, 3)).toBe(1.6)
    b.tryPush('east', grid, TILE)
    expect(b.moving).toBe(false)
    expect(grid.supportHeight(4, 3)).toBe(1.6)
  })
})
