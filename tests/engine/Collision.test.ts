import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { resolveHorizontal, type AABB } from '../../src/engine/Collision'

function aabb(x: number, z: number, w = 0.8, d = 0.8): AABB {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }
}

describe('Collision.resolveHorizontal', () => {
  it('blocks X-axis movement when target tile is solid (X only)', () => {
    const g = new Grid(4, 4)
    g.setSolid(2, 1, true)
    const start = { x: 1, z: 1 }
    const end = { x: 2.5, z: 1 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 1)
    expect(r.blockedX).toBe(true)
    expect(r.blockedZ).toBe(false)
    expect(r.x).toBeLessThan(2.5)
    expect(r.z).toBe(1)
  })

  it('blocks Z-axis movement when target tile is solid (Z only)', () => {
    const g = new Grid(4, 4)
    g.setSolid(1, 2, true)
    const start = { x: 1, z: 1 }
    const end = { x: 1, z: 2.5 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 1)
    expect(r.blockedX).toBe(false)
    expect(r.blockedZ).toBe(true)
    expect(r.x).toBe(1)
    expect(r.z).toBeLessThan(2.5)
  })

  it('handles diagonal into corner: both axes resolve, no slip-through', () => {
    const g = new Grid(4, 4)
    g.setSolid(2, 2, true)
    const start = { x: 1, z: 1 }
    const end = { x: 2.5, z: 2.5 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 1)
    expect(r.blockedX).toBe(true)
    expect(r.blockedZ).toBe(true)
    expect(r.x).toBeLessThan(2)
    expect(r.z).toBeLessThan(2)
  })

  it('high-speed motion does not tunnel through solid (swept resolution)', () => {
    const g = new Grid(8, 8)
    g.setSolid(3, 1, true)
    const start = { x: 1, z: 1 }
    const end = { x: 7, z: 1 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 1)
    expect(r.blockedX).toBe(true)
    expect(r.x).toBeLessThan(3)
  })

  it('passes through non-solid cells unchanged', () => {
    const g = new Grid(4, 4)
    const start = { x: 1, z: 1 }
    const end = { x: 1.5, z: 1.5 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 1)
    expect(r.blockedX).toBe(false)
    expect(r.blockedZ).toBe(false)
    expect(r.x).toBe(1.5)
    expect(r.z).toBe(1.5)
  })

  it('treats out-of-bounds as solid (room walls)', () => {
    const g = new Grid(4, 4)
    const start = { x: 0.5, z: 1 }
    const end = { x: -1, z: 1 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 1)
    expect(r.blockedX).toBe(true)
  })

  describe('y-aware step-up', () => {
    const shape = { minX: -0.4, maxX: 0.4, minZ: -0.4, maxZ: 0.4 }

    it('actor below support height is blocked by a solid cell', () => {
      const grid = new Grid(8, 8)
      grid.setSolid(3, 2, true)
      grid.setSupport(3, 2, 1.0)
      const r = resolveHorizontal({ x: 5, z: 5 }, { x: 6.5, z: 5 }, shape, grid, 2, 0)
      expect(r.blockedX).toBe(true)
    })

    it('actor at/above support height enters the solid cell', () => {
      const grid = new Grid(8, 8)
      grid.setSolid(3, 2, true)
      grid.setSupport(3, 2, 1.0)
      const r = resolveHorizontal({ x: 5, z: 5 }, { x: 6.5, z: 5 }, shape, grid, 2, 0.97)
      expect(r.blockedX).toBe(false)
      expect(r.x).toBeCloseTo(6.5)
    })

    it('out-of-bounds always blocks regardless of height', () => {
      const grid = new Grid(8, 8)
      const r = resolveHorizontal({ x: 1, z: 5 }, { x: -1, z: 5 }, shape, grid, 2, 99)
      expect(r.blockedX).toBe(true)
    })

    it('solid cell with zero support (wall-like) always blocks', () => {
      const grid = new Grid(8, 8)
      grid.setSolid(3, 2, true)
      grid.setSupport(3, 2, 0)
      const r = resolveHorizontal({ x: 5, z: 5 }, { x: 6.5, z: 5 }, shape, grid, 2, 5)
      expect(r.blockedX).toBe(true)
    })

    it('omitting actorY keeps legacy always-block behavior', () => {
      const grid = new Grid(8, 8)
      grid.setSolid(3, 2, true)
      grid.setSupport(3, 2, 1.0)
      const r = resolveHorizontal({ x: 5, z: 5 }, { x: 6.5, z: 5 }, shape, grid, 2)
      expect(r.blockedX).toBe(true)
    })
  })
})
