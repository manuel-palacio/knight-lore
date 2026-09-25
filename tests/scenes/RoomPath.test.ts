import { describe, it, expect } from 'vitest'
import type { RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { findFloorPath, patrolledCells } from '../e2e/support/roomPath'

const room = (extra: Partial<RoomSpec>): RoomSpec => ({
  id: 'test', tint: 'blue', exits: [], spawn: { x: 4, z: 1 }, ...extra,
})

describe('patrolledCells', () => {
  it('covers every cell of a ball line, both ends included', () => {
    const cells = patrolledCells(room({ balls: [{ from: { x: 1, z: 2 }, to: { x: 4, z: 2 } }] }))
    expect([...cells].sort()).toEqual(['1,2', '2,2', '3,2', '4,2'])
  })

  it('covers every leg of a guard loop, the closing leg too', () => {
    const cells = patrolledCells(room({ pathGuards: [{ path: [{ x: 3, z: 3 }, { x: 3, z: 5 }, { x: 5, z: 5 }] }] }))
    expect([...cells].sort()).toEqual(['3,3', '3,4', '3,5', '4,4', '4,5', '5,5'])
  })
})

describe('findFloorPath', () => {
  it('walks round a ball line when a clear lane exists', () => {
    const spec = room({ balls: [{ from: { x: 3, z: 2 }, to: { x: 3, z: 6 } }] })
    const path = findFloorPath(spec, { x: 0, z: 4 }, { x: 7, z: 4 })
    const crossed = path.filter((c) => c.x === 3 && c.z >= 2 && c.z <= 6)
    expect(crossed).toEqual([])
    expect(path.at(-1)).toEqual({ x: 7, z: 4 })
  })

  it('crosses a line when there is no other way', () => {
    const spec = room({ balls: [{ from: { x: 3, z: 0 }, to: { x: 3, z: 7 } }] })
    const path = findFloorPath(spec, { x: 0, z: 4 }, { x: 7, z: 4 })
    expect(path).toHaveLength(8)
  })

  it('may start or end on a line', () => {
    const spec = room({ balls: [{ from: { x: 1, z: 1 }, to: { x: 6, z: 1 } }] })
    expect(findFloorPath(spec, { x: 4, z: 1 }, { x: 4, z: 3 })).toEqual([{ x: 4, z: 1 }, { x: 4, z: 2 }, { x: 4, z: 3 }])
  })
})

describe('findFloorPath over spike rows', () => {
  const barrier = room({ spikes: [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, z: 4 })) })

  it('jumps a spike row that spans the room: the path skips over the spike cell', () => {
    const path = findFloorPath(barrier, { x: 4, z: 0 }, { x: 4, z: 7 })
    expect(path).toContainEqual({ x: 4, z: 3 })
    expect(path).toContainEqual({ x: 4, z: 5 })
    expect(path.some((c) => c.z === 4)).toBe(false)
  })

  it('walks round a spike row when it can, rather than jump', () => {
    const gap = room({ spikes: [0, 1, 2, 3, 4].map((x) => ({ x, z: 4 })) })
    const path = findFloorPath(gap, { x: 4, z: 0 }, { x: 4, z: 7 })
    path.slice(1).forEach((c, i) => expect(Math.abs(c.x - path[i]!.x) + Math.abs(c.z - path[i]!.z)).toBe(1))
  })

  it('never jumps a block or two spike rows at once', () => {
    const wall = room({ platforms: [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, z: 4, height: 1 })) })
    expect(() => findFloorPath(wall, { x: 4, z: 0 }, { x: 4, z: 7 })).toThrow()
    const deep = room({ spikes: [0, 1, 2, 3, 4, 5, 6, 7].flatMap((x) => [{ x, z: 4 }, { x, z: 5 }]) })
    expect(() => findFloorPath(deep, { x: 4, z: 0 }, { x: 4, z: 7 })).toThrow()
  })
})
