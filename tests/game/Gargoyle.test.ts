import { describe, it, expect } from 'vitest'
import { Gargoyle } from '../../src/game/Gargoyle'
import { hazardHunts, touchesHazard } from '../../src/game/Hazards'

// He, 0.8 across and 2 high, by a gargoyle one block up on cell (3,3).
const him = (x: number, y: number, z: number) => ({ position: { x, y, z }, extents: { x: 0.8, y: 2, z: 0.8 } })

describe('Gargoyle (type 4, handler 0xB7A3: deadly, 0xB85C)', () => {
  const gargoyle = new Gargoyle(3, 3, 1, 2)

  it('kills man and wolf alike', () => {
    expect(hazardHunts(gargoyle)).toBe(true)
  })

  it('kills him walking into it, stopped flush against its side', () => {
    expect(touchesHazard(him(7 - 1.4, 0.5, 7), gargoyle)).toBe(true)
  })

  it('kills him standing on it', () => {
    expect(touchesHazard(him(7, 2, 7), gargoyle)).toBe(true)
  })

  it('leaves him be a cell away, or passing under it', () => {
    expect(touchesHazard(him(5, 1, 7), gargoyle)).toBe(false)
    const high = new Gargoyle(3, 3, 3, 2)
    expect(touchesHazard(him(7 - 1.4, 0, 7), high)).toBe(false)
  })
})
