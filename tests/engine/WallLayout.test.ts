import { describe, it, expect } from 'vitest'
import { buildWallLayout, WALL_HEIGHT, type WallBox } from '../../src/engine/WallLayout'

const TILE = 2
const W = 8
const D = 8

function overlaps(box: WallBox, other: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }): boolean {
  return box.x0 < other.x1 && box.x1 > other.x0 && box.z0 < other.z1 && box.z1 > other.z0 && box.y0 < other.y1 && box.y1 > other.y0
}

describe('buildWallLayout', () => {
  it('places every wall brick behind the north or west edge, never inside the room', () => {
    const boxes = buildWallLayout(W, D, [], TILE).filter((b) => b.kind === 'wall')
    for (const b of boxes) expect(b.z1 <= 0 || b.x1 <= 0).toBe(true)
  })

  it('is deterministic for the same room', () => {
    expect(buildWallLayout(W, D, ['north'], TILE)).toEqual(buildWallLayout(W, D, ['north'], TILE))
  })

  it('builds full-height corner columns at both ends and the back corner', () => {
    const boxes = buildWallLayout(W, D, [], TILE)
    const columnTop = (x: number, z: number) =>
      Math.max(...boxes.filter((b) => b.x0 <= x && b.x1 >= x && b.z0 <= z && b.z1 >= z).map((b) => b.y1))
    expect(columnTop(-0.25, -0.25)).toBe(WALL_HEIGHT)
    expect(columnTop(W * TILE - 0.25, -0.25)).toBe(WALL_HEIGHT)
    expect(columnTop(-0.25, D * TILE - 0.25)).toBe(WALL_HEIGHT)
  })

  it('leaves the lattice sparse between the columns', () => {
    const wall = buildWallLayout(W, D, [], TILE).filter((b) => b.kind === 'wall')
    const northSpan = wall.filter((b) => b.z1 <= 0 && b.x0 >= 0 && b.x1 <= W * TILE)
    const filled = northSpan.reduce((sum, b) => sum + (b.x1 - b.x0) * (b.y1 - b.y0), 0)
    const area = W * TILE * WALL_HEIGHT
    expect(filled / area).toBeGreaterThan(0.15)
    expect(filled / area).toBeLessThan(0.5)
  })

  it('cuts a clear opening in the north wall for a north exit', () => {
    const boxes = buildWallLayout(W, D, ['north'], TILE)
    const mid = Math.floor(W / 2) * TILE + TILE / 2
    const opening = { x0: mid - 1, x1: mid + 1, z0: -1, z1: 0, y0: 0, y1: 2.5 }
    expect(boxes.some((b) => overlaps(b, opening))).toBe(false)
  })

  it('cuts a clear opening in the west wall for a west exit', () => {
    const boxes = buildWallLayout(W, D, ['west'], TILE)
    const mid = Math.floor(D / 2) * TILE + TILE / 2
    const opening = { x0: -1, x1: 0, z0: mid - 1, z1: mid + 1, y0: 0, y1: 2.5 }
    expect(boxes.some((b) => overlaps(b, opening))).toBe(false)
  })

  it('builds a tall pointed arch for every exit, reaching near wall height', () => {
    for (const dir of ['north', 'south', 'east', 'west'] as const) {
      const arch = buildWallLayout(W, D, [dir], TILE).filter((b) => b.kind === 'arch')
      expect(arch.length).toBeGreaterThan(6)
      expect(Math.max(...arch.map((b) => b.y1))).toBeGreaterThanOrEqual(WALL_HEIGHT - 0.5)
    }
  })

  it('stands south and east arches on the open front edges', () => {
    const south = buildWallLayout(W, D, ['south'], TILE).filter((b) => b.kind === 'arch')
    for (const b of south) expect(b.z0).toBeGreaterThanOrEqual(D * TILE)
    const east = buildWallLayout(W, D, ['east'], TILE).filter((b) => b.kind === 'arch')
    for (const b of east) expect(b.x0).toBeGreaterThanOrEqual(W * TILE)
  })
})
