import { describe, it, expect } from 'vitest'
import type { RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { findFloorPath, guardedEdges, patrolledCells } from '../e2e/support/roomPath'

const room = (extra: Partial<RoomSpec>): RoomSpec => ({
  id: 'test', tint: 'blue', exits: [], spawn: { x: 4, z: 1 }, ...extra,
})

describe('patrolledCells', () => {
  it('covers the cell a ball bounces on, and both cells of one half a cell over', () => {
    expect([...patrolledCells(room({ balls: [{ x: 1, z: 2, height: 0 }] }))]).toEqual(['1,2'])
    const cells = patrolledCells(room({ balls: [{ x: 1.5, z: 2.5, height: 0 }] }))
    expect([...cells].sort()).toEqual(['1,2', '1,3', '2,2', '2,3'])
  })

  it('leaves both rows of a guard walking between them to the walker, and guards the steps across its line', () => {
    const spec = room({ pathGuards: [{ path: [{ x: 1, z: 2.5 }, { x: 3, z: 2.5 }] }] })
    expect([...patrolledCells(spec)]).toEqual([])
    expect([...guardedEdges(spec)].sort()).toEqual(['1,2|1,3', '2,2|2,3', '3,2|3,3'])
  })

  it('covers every leg of a guard loop, the closing leg too', () => {
    const cells = patrolledCells(room({ pathGuards: [{ path: [{ x: 3, z: 3 }, { x: 3, z: 5 }, { x: 5, z: 5 }] }] }))
    expect([...cells].sort()).toEqual(['3,3', '3,4', '3,5', '4,4', '4,5', '5,5'])
  })
})

describe('findFloorPath', () => {
  it('walks round a guard line when a clear lane exists', () => {
    const spec = room({ pathGuards: [{ path: [{ x: 3, z: 2 }, { x: 3, z: 6 }] }] })
    const path = findFloorPath(spec, { x: 0, z: 4 }, { x: 7, z: 4 })
    const crossed = path.filter((c) => c.x === 3 && c.z >= 2 && c.z <= 6)
    expect(crossed).toEqual([])
    expect(path.at(-1)).toEqual({ x: 7, z: 4, y: 0 })
  })

  it('crosses a line when there is no other way', () => {
    const spec = room({ pathGuards: [{ path: [{ x: 3, z: 0 }, { x: 3, z: 7 }] }] })
    const path = findFloorPath(spec, { x: 0, z: 4 }, { x: 7, z: 4 })
    expect(path).toHaveLength(8)
  })

  it('may start or end on a line', () => {
    const spec = room({ pathGuards: [{ path: [{ x: 1, z: 1 }, { x: 6, z: 1 }] }] })
    expect(findFloorPath(spec, { x: 4, z: 1 }, { x: 4, z: 3 })).toEqual([{ x: 4, z: 1, y: 0 }, { x: 4, z: 2, y: 0 }, { x: 4, z: 3, y: 0 }])
  })
})

describe('findFloorPath over spike rows', () => {
  const barrier = room({ spikes: [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, z: 4 })) })

  it('jumps a spike row that spans the room: the path skips over the spike cell', () => {
    const path = findFloorPath(barrier, { x: 4, z: 0 }, { x: 4, z: 7 })
    expect(path).toContainEqual({ x: 4, z: 3, y: 0 })
    expect(path).toContainEqual({ x: 4, z: 5, y: 0 })
    expect(path.some((c) => c.z === 4)).toBe(false)
  })

  it('walks round a spike row when it can, rather than jump', () => {
    const gap = room({ spikes: [0, 1, 2, 3, 4].map((x) => ({ x, z: 4 })) })
    const path = findFloorPath(gap, { x: 4, z: 0 }, { x: 4, z: 7 })
    path.slice(1).forEach((c, i) => expect(Math.abs(c.x - path[i]!.x) + Math.abs(c.z - path[i]!.z)).toBe(1))
  })

  it('never jumps a wall too high to climb, or two spike rows at once', () => {
    const wall = room({ platforms: [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, z: 4, height: 3 })) })
    expect(() => findFloorPath(wall, { x: 4, z: 0 }, { x: 4, z: 7 })).toThrow()
    const deep = room({ spikes: [0, 1, 2, 3, 4, 5, 6, 7].flatMap((x) => [{ x, z: 4 }, { x, z: 5 }]) })
    expect(() => findFloorPath(deep, { x: 4, z: 0 }, { x: 4, z: 7 })).toThrow()
  })
})

describe('findFloorPath round portcullises', () => {
  const key = (c: { x: number; z: number }) => `${c.x},${c.z}`

  it('walks round a cage of gates rather than through it', () => {
    const cage = room({ portcullises: [{ from: { x: 3, z: 2 }, to: { x: 4, z: 2 } }, { from: { x: 3, z: 5 }, to: { x: 4, z: 5 } }] })
    const path = findFloorPath(cage, { x: 4, z: 0 }, { x: 4, z: 7 })
    expect(path.some((c) => ['3,2', '4,2', '3,5', '4,5'].includes(key(c)))).toBe(false)
  })

  it('crosses a grille straight through, never walking along under it', () => {
    const gate = room({ portcullises: [{ from: { x: 5, z: 0 }, to: { x: 5, z: 7 } }] })
    const path = findFloorPath(gate, { x: 7, z: 5 }, { x: 3, z: 1 })
    expect(path.filter((c) => c.x === 5)).toHaveLength(1)
  })

  it('goes through a gate that spans the room, since there is no other way', () => {
    const gate = room({ portcullises: [{ from: { x: 0, z: 5 }, to: { x: 7, z: 5 } }] })
    const path = findFloorPath(gate, { x: 4, z: 0 }, { x: 4, z: 7 })
    expect(path.filter((c) => c.z === 5)).toHaveLength(1)
  })
})

describe('findFloorPath with heights', () => {
  it('climbs a one-high block that walls a corridor, and drops down the far side', () => {
    const wall = room({ depth: 4, platforms: [{ x: 4, z: 0, height: 4 }, { x: 4, z: 1, height: 1 }, { x: 4, z: 2, height: 4 }, { x: 4, z: 3, height: 4 }] })
    const path = findFloorPath(wall, { x: 7, z: 2 }, { x: 0, z: 2 })
    expect(path).toContainEqual({ x: 4, z: 1, y: 1 })
    expect(path.at(-1)).toEqual({ x: 0, z: 2, y: 0 })
  })

  it('climbs a wall two blocks high with a held jump and a run-up, but not three', () => {
    const two = room({ width: 4, platforms: [0, 1, 2, 3].map((x) => ({ x, z: 3, height: 2 })) })
    const path = findFloorPath(two, { x: 2, z: 7 }, { x: 2, z: 0 })
    const up = path.findIndex((c) => c.y === 2)
    expect(path[up - 1]!.y).toBe(0)
    expect(path[up - 2]!.z - path[up - 1]!.z).toBe(path[up - 1]!.z - path[up]!.z)
    const three = room({ width: 4, platforms: [0, 1, 2, 3].map((x) => ({ x, z: 3, height: 3 })) })
    expect(() => findFloorPath(three, { x: 2, z: 7 }, { x: 2, z: 0 })).toThrow()
  })

  it('has no run-up for a two-high jump from right against a wall', () => {
    const tight = room({ width: 4, depth: 3, platforms: [0, 1, 2, 3].map((x) => ({ x, z: 1, height: 2 })) })
    expect(() => findFloorPath(tight, { x: 2, z: 2 }, { x: 2, z: 0 })).toThrow()
  })

  it('walks under a block hanging two blocks up, but must jump onto one hanging a block up', () => {
    const high = room({ width: 4, platforms: [0, 1, 3].map((x) => ({ x, z: 3, height: 4 })), floatingBlocks: [{ x: 2, z: 3, bottom: 2 }] })
    expect(findFloorPath(high, { x: 2, z: 7 }, { x: 2, z: 0 }).some((c) => c.z === 3 && c.y === 0)).toBe(true)
    const low = room({ width: 4, platforms: [0, 1, 3].map((x) => ({ x, z: 3, height: 4 })), floatingBlocks: [{ x: 2, z: 3, bottom: 1 }] })
    expect(findFloorPath(low, { x: 2, z: 7 }, { x: 2, z: 0 })).toContainEqual({ x: 2, z: 3, y: 2 })
  })

  it('does not stand on a block topped with spikes', () => {
    const spiked = room({ depth: 4, platforms: [{ x: 4, z: 0, height: 4 }, { x: 4, z: 1, height: 1 }, { x: 4, z: 2, height: 4 }, { x: 4, z: 3, height: 4 }], spikes: [{ x: 4, z: 1, height: 1 }] })
    expect(() => findFloorPath(spiked, { x: 7, z: 2 }, { x: 0, z: 2 })).toThrow()
  })
})

describe('findFloorPath: jumps into danger', () => {
  it('does not jump a spike row with spikes hanging above it too', () => {
    const trap = room({ spikes: [0, 1, 2, 3, 4, 5, 6, 7].flatMap((x) => [{ x, z: 4 }, { x, z: 4, height: 1 }]) })
    expect(() => findFloorPath(trap, { x: 4, z: 0 }, { x: 4, z: 7 })).toThrow()
  })
})

describe('findFloorPath past a guard walking between two rows', () => {
  it('goes round by the row it is on rather than cross the guard\'s line', () => {
    const spec = room({ pathGuards: [{ path: [{ x: 3, z: 1.5 }, { x: 5, z: 1.5 }] }] })
    const path = findFloorPath(spec, { x: 7, z: 1 }, { x: 4, z: 0 })
    expect(path.some((c) => c.z >= 2)).toBe(false)
  })
})

describe('findFloorPath past a moving block', () => {
  it('keeps off its track when there is a way round, since the block may stand in the way', () => {
    const spec = room({ width: 4, movingPlatforms: [{ from: { x: 2, z: 2 }, to: { x: 2, z: 4 }, height: 1 }] })
    const path = findFloorPath(spec, { x: 2, z: 7 }, { x: 2, z: 0 })
    expect(path.some((c) => c.x === 2 && c.z >= 2 && c.z <= 4)).toBe(false)
  })
})

describe('findFloorPath past spiked balls and falling blocks', () => {
  const row = (first: { drops?: boolean }) => [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, z: 4, height: 6, ...(x === 0 ? first : {}) }))

  it('walks under hanging spiked balls, but not where the room\'s dropper will lie', () => {
    const spec = room({ spikedBalls: row({ drops: true }) })
    const path = findFloorPath(spec, { x: 0, z: 0 }, { x: 0, z: 7 })
    expect(path.some((c) => c.x === 0 && c.z === 4)).toBe(false)
    expect(path.some((c) => c.z === 4 && c.y === 0)).toBe(true)
  })

  it('stands on a falling block at its height, as on a collapsing one', () => {
    const wall = room({ depth: 4, platforms: [{ x: 4, z: 0, height: 4 }, { x: 4, z: 2, height: 4 }, { x: 4, z: 3, height: 4 }], fallingBlocks: [{ x: 4, z: 1, height: 1 }] })
    expect(findFloorPath(wall, { x: 7, z: 1 }, { x: 0, z: 1 })).toContainEqual({ x: 4, z: 1, y: 1 })
  })
})
