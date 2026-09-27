// A room's walls, arches, gates and hedges as the original draws them: its
// own sprites at its own places (tools/rip/backdrop.py). Positions are the
// original's pixels: x and y across the floor (a cell 16, the first cell's
// middle at 0x48, y running the other way to our z), z up from the floor at
// 0x80 (a block 12); dx and dy the offsets its handler draws the sprite by.
export interface BackdropPart {
  graphic: number
  x: number
  y: number
  z: number
  flip: boolean
  dx: number
  dy: number
}

const SCREEN_BOTTOM_ROW = 191
const HALF_WIDTH = 128
const DRAWN_FROM_Z = 0x68
const FLOOR_Z = 0x80
const WEST_EDGE = 0x40
const NORTH_EDGE = 0xc0
const PIXELS_PER_UNIT = 8
const PIXELS_PER_BLOCK = 12
const FULL_ROOM_CELLS = 8
const UNITS_PER_CELL = 2

// Where on the 256x192 screen the sprite's top left corner goes (0xD6D1).
export function backdropScreenPlace(part: BackdropPart, spriteHeight: number): { left: number; top: number } {
  const left = part.x + part.y - HALF_WIDTH + part.dx
  const up = Math.floor((part.y - part.x + HALF_WIDTH) / 2) + part.z - DRAWN_FROM_Z + part.dy
  return { left, top: SCREEN_BOTTOM_ROW - up - spriteHeight + 1 }
}

// Where the part stands in the room, in the room's own units (a narrow room
// begins two cells in), to be drawn in turn with everything else.
export function backdropWorldPlace(part: BackdropPart, width: number, depth: number): { x: number; y: number; z: number } {
  const shiftX = ((FULL_ROOM_CELLS - width) / 2) * UNITS_PER_CELL
  const shiftZ = ((FULL_ROOM_CELLS - depth) / 2) * UNITS_PER_CELL
  return {
    x: (part.x - WEST_EDGE) / PIXELS_PER_UNIT - shiftX,
    y: (part.z - FLOOR_Z) / PIXELS_PER_BLOCK,
    z: (NORTH_EDGE - part.y) / PIXELS_PER_UNIT - shiftZ,
  }
}
