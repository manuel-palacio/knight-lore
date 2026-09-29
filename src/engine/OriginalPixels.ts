// The original's own coordinates for a place in a room: x and y across the
// floor, a cell 16 pixels, the first cell's middle at 0x48 (the loader at
// 0xD46C), y running the other way to our z, a narrow room standing in the
// middle cells; z up from the floor at 0x80, a block 12 (the room-size table
// at 0x6248). 8 pixels make one of our units across the floor.
export const PIXELS_PER_UNIT = 8
export const PIXELS_PER_BLOCK = 12
export const FULL_ROOM_CELLS = 8

const UNITS_PER_CELL = 2
const WEST_EDGE = 0x40
const NORTH_EDGE = 0xc0
const FLOOR_Z = 0x80

export interface Place {
  x: number
  y: number
  z: number
}

export interface RoomCells {
  width: number
  depth: number
}

// Our place (y up) as the original's pixels (z up).
export function toOriginalPixels(at: Place, room: RoomCells): Place {
  const shift = narrowRoomShift(room)
  return {
    x: WEST_EDGE + PIXELS_PER_UNIT * (at.x + shift.x),
    y: NORTH_EDGE - PIXELS_PER_UNIT * (at.z + shift.z),
    z: FLOOR_Z + PIXELS_PER_BLOCK * at.y,
  }
}

// The original's pixels (z up) as our place (y up).
export function fromOriginalPixels(px: Place, room: RoomCells): Place {
  const shift = narrowRoomShift(room)
  return {
    x: (px.x - WEST_EDGE) / PIXELS_PER_UNIT - shift.x,
    y: (px.z - FLOOR_Z) / PIXELS_PER_BLOCK,
    z: (NORTH_EDGE - px.y) / PIXELS_PER_UNIT - shift.z,
  }
}

// A narrow room begins this many of our units in.
function narrowRoomShift(room: RoomCells): { x: number; z: number } {
  return {
    x: ((FULL_ROOM_CELLS - room.width) / 2) * UNITS_PER_CELL,
    z: ((FULL_ROOM_CELLS - room.depth) / 2) * UNITS_PER_CELL,
  }
}
