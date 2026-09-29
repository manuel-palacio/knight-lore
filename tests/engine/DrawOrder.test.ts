import { describe, it, expect } from 'vitest'
import { drawOrder, type Boxed } from '../../src/engine/DrawOrder'

const item = (name: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, depth: number): Boxed & { name: string } =>
  ({ name, box: { x0, x1, z0, z1, y0, y1 }, depth })
const names = (items: (Boxed & { name: string })[]) => drawOrder(items).map((i) => i.name)

// As the original sorts: whatever lies wholly behind or below another is drawn first.
describe('drawOrder', () => {
  it('draws him after the block he stands on, even on its back half where his middle is behind the block\'s', () => {
    // A block in cell (2, 2) from level 1 to 2; he stands on it near its back corner.
    const block = item('block', 4, 6, 4, 6, 1, 2, 5 + 5)
    const man = item('man', 4.1, 4.9, 4.1, 4.9, 2, 4, 4.5 + 4.5)
    expect(names([block, man])).toEqual(['block', 'man'])
  })

  it('draws a block in front of him after him, whatever its height', () => {
    const man = item('man', 4.1, 4.9, 4.1, 4.9, 0, 2, 9)
    const front = item('front', 4, 6, 8, 10, 0, 1, 14)
    expect(names([front, man])).toEqual(['man', 'front'])
  })

  it('draws the wall behind everything in the room', () => {
    const wall = item('wall', -1, -0.5, 0, 16, 0, 4, 7)
    const man = item('man', 0.1, 0.9, 7.6, 8.4, 0, 2, 8.5)
    expect(names([man, wall])).toEqual(['wall', 'man'])
  })

  it('falls back to the depth order for things whose boxes overlap', () => {
    const a = item('a', 0, 2, 0, 2, 0, 1, 3)
    const b = item('b', 1, 3, 1, 3, 0, 1, 2)
    expect(names([a, b])).toEqual(['b', 'a'])
  })
})
