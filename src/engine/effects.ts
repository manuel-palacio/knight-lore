import type { Note } from './Beeper'

// The original's sound effects, played on its beeper routine (0xB4ED): one
// square-wave cycle, the speaker on for B turns of a djnz loop and off for B
// more (B = 0 turns 256 times). At the Spectrum's 3.5 MHz a cycle takes about
// 26·B + 82 T-states, counting the loop that calls it. Each effect below
// replays its routine's loop, a run of cycles at one pitch making one note.
const CPU_HZ = 3_500_000
const T_STATES_A_TURN = 26
const T_STATES_A_CYCLE = 82

function cycles(b: number, count = 1): Note {
  const period = (T_STATES_A_TURN * (b === 0 ? 256 : b) + T_STATES_A_CYCLE) / CPU_HZ
  return { frequency: 1 / period, duration: period * count }
}

// Where the original has a thing, in its pixels: a cell is 16 across from 0x48
// (the loader at 0xD46C), its y running the other way to our z, a narrow room
// standing in the middle cells; heights 12 a block up from the floor at 0x80
// (the room-size table at 0x6248).
const FULL_ROOM_CELLS = 8
const CELL_PX = 16
const UNIT_PX = 8
const FIRST_CELL_PX = 0x48
const FLOOR_PX = 0x80
const BLOCK_PX = 12

export interface RoomCells {
  width: number
  depth: number
}

function originalPixels(at: { x: number; y: number; z: number }, room: RoomCells): { x: number; y: number; z: number } {
  const dx = ((FULL_ROOM_CELLS - room.width) / 2) * CELL_PX
  const dy = ((FULL_ROOM_CELLS - room.depth) / 2) * CELL_PX
  return {
    x: FIRST_CELL_PX + dx + UNIT_PX * (at.x - 1),
    y: FIRST_CELL_PX + dy + UNIT_PX * (2 * room.depth - 1 - at.z),
    z: FLOOR_PX + BLOCK_PX * at.y,
  }
}

// A table or a chest on the move (0xB467, from 0xC232 each frame one has
// moved): six cycles at a pitch from its place, x + y + z complemented and
// rotated left twice, so it glides as the box slides.
export function pushEffect(at: { x: number; y: number; z: number }, room: RoomCells): Note[] {
  const px = originalPixels(at, room)
  const sum = ~Math.round(px.x + px.y + px.z) & 0xff
  const pitch = ((sum << 2) | (sum >> 6)) & 0xff
  return [cycles(pitch, 6)]
}
