import { describe, it, expect } from 'vitest'
import { backdropScreenPlace, backdropWorldPlace, type BackdropPart } from '../../src/engine/Backdrop'

// map--4-3's west arch, near half: graphic 2 at x 0x3B, y 0x73, z 0x80, offsets (-7, -3).
const nearHalf: BackdropPart = { graphic: 2, x: 0x3b, y: 0x73, z: 0x80, flip: false, dx: -7, dy: -3 }

describe('backdropScreenPlace (0xD6D1)', () => {
  it('draws a part at x + y - 128 + dx across, and (y - x + 128) / 2 + z - 0x68 + dy up from the bottom row', () => {
    // Across: 59 + 115 - 128 - 7 = 39. Up: (115 - 59 + 128) / 2 + 128 - 104 - 3 = 113,
    // so a sprite 52 high has its bottom row at 191 - 113 = 78, its top at 27.
    expect(backdropScreenPlace(nearHalf, 52)).toEqual({ left: 39, top: 27 })
  })
})

describe('backdropWorldPlace', () => {
  it('stands a part where it is in the room, in the room\'s own units, for drawing in turn with the rest', () => {
    // x 0x3B is 5 pixels short of cell 0's west edge (0x40); y 0x73 is cell 4's y, our z 7 - 4 = 3, less 5/8.
    expect(backdropWorldPlace(nearHalf, 8, 8)).toEqual({ x: -5 / 8, y: 0, z: (0xc0 - 0x73) / 8 })
  })

  it('shifts a narrow room\'s parts by the two cells it stands in from the full room\'s edge', () => {
    expect(backdropWorldPlace(nearHalf, 4, 8).x).toBe(-5 / 8 - 4)
    expect(backdropWorldPlace(nearHalf, 8, 4).z).toBe((0xc0 - 0x73) / 8 - 4)
  })
})
