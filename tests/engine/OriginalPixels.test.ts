import { describe, it, expect } from 'vitest'
import { fromOriginalPixels, toOriginalPixels } from '../../src/engine/OriginalPixels'

describe('OriginalPixels', () => {
  const full = { width: 8, depth: 8 }

  it('puts the first cell of a full room at 0x48, its y running the other way to our z', () => {
    expect(toOriginalPixels({ x: 1, y: 0, z: 15 }, full)).toEqual({ x: 0x48, y: 0x48, z: 0x80 })
    expect(toOriginalPixels({ x: 1, y: 0, z: 1 }, full)).toEqual({ x: 0x48, y: 0x48 + 16 * 7, z: 0x80 })
  })

  it('counts heights 12 pixels a block up from the floor at 0x80', () => {
    expect(toOriginalPixels({ x: 1, y: 2, z: 15 }, full).z).toBe(0x80 + 24)
  })

  it('stands a narrow room in the middle cells', () => {
    expect(toOriginalPixels({ x: 1, y: 0, z: 7 }, { width: 4, depth: 4 })).toEqual({ x: 0x48 + 32, y: 0x48 + 32, z: 0x80 })
  })

  it('takes the original pixels back to the same place', () => {
    const room = { width: 4, depth: 8 }
    const at = { x: 3.5, y: 1.25, z: 6 }
    expect(fromOriginalPixels(toOriginalPixels(at, room), room)).toEqual(at)
  })
})
