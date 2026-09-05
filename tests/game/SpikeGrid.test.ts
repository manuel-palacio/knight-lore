import { describe, it, expect } from 'vitest'
import { Spike, placeSpikes } from '../../src/game/SpikeGrid'
import { Room } from '../../src/game/Room'
import { Category } from '../../src/engine/categories'

describe('Spike', () => {
  it('sits at its tile center, marked HAZARD, short enough to jump over', () => {
    const s = new Spike(3, 5, 2)
    expect(s.hasCategory(Category.HAZARD)).toBe(true)
    expect(s.position.x).toBe(7)
    expect(s.position.z).toBe(11)
    expect(s.extents.y).toBeLessThan(1.0)
  })

  it('placeSpikes adds one entity per tile to the room', () => {
    const room = new Room('test', 8, 8)
    const before = room.entities.length
    placeSpikes(room, [{ x: 1, z: 3 }, { x: 2, z: 3 }, { x: 3, z: 3 }])
    expect(room.entities.length).toBe(before + 3)
    expect(room.entities.every((e) => e.hasCategory(Category.HAZARD))).toBe(true)
  })
})
