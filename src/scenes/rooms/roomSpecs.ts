import type { RoomTint, RoomStyle } from './shell'
import type { ItemId } from './items'

// Data-driven rooms. A spec is pure data (unit-tested for map integrity);
// buildRoomFromSpec turns it into a Room. Cells are 0..7 on the 8x8 grid.
// Doorways sit mid-edge: north (4,0), south (4,7), west (0,4), east (7,4).

export type Direction = 'north' | 'south' | 'east' | 'west'

export interface Cell {
  x: number
  z: number
}

export interface RoomSpec {
  id: string
  tint: RoomTint
  style: RoomStyle
  exits: { direction: Direction; target: string }[]
  spawn: Cell
  platforms?: (Cell & { height: number })[]
  pushBlocks?: Cell[]
  spikes?: Cell[]
  guards?: { from: Cell; to: Cell; speed?: number }[]
  ghosts?: Cell[]
  pickups?: (Cell & { item: ItemId })[]
  movingPlatforms?: { from: Cell; to: Cell; height: number }[]
  pathGuards?: { path: Cell[] }[]
}

const OPPOSITE: Record<Direction, Direction> = { north: 'south', south: 'north', east: 'west', west: 'east' }

export function oppositeOf(direction: Direction): Direction {
  return OPPOSITE[direction]
}

// Walking out through a door lands you just inside the opposite edge.
export function entryFor(direction: Direction): { x: number; z: number } {
  switch (direction) {
    case 'south': return { x: 8, z: 1 }
    case 'north': return { x: 8, z: 15 }
    case 'east': return { x: 1, z: 8 }
    case 'west': return { x: 15, z: 8 }
  }
}

// Exits of the five hand-built rooms, kept here so the map test can check
// that every doorway on the whole map leads somewhere and back.
export const LEGACY_ROOM_LINKS: { id: string; exits: { direction: Direction; target: string }[] }[] = [
  { id: 'room-001', exits: [
    { direction: 'north', target: 'room-002' }, { direction: 'east', target: 'room-003' },
    { direction: 'south', target: 'room-008' }, { direction: 'west', target: 'room-009' },
  ] },
  { id: 'room-002', exits: [
    { direction: 'south', target: 'room-001' }, { direction: 'west', target: 'room-006' }, { direction: 'east', target: 'room-010' },
  ] },
  { id: 'room-003', exits: [
    { direction: 'west', target: 'room-001' }, { direction: 'east', target: 'room-004' },
    { direction: 'south', target: 'room-005' }, { direction: 'north', target: 'room-010' },
  ] },
  { id: 'room-004', exits: [
    { direction: 'west', target: 'room-003' }, { direction: 'east', target: 'room-011' },
    { direction: 'south', target: 'room-012' }, { direction: 'north', target: 'room-007' },
  ] },
  { id: 'room-005', exits: [
    { direction: 'north', target: 'room-003' }, { direction: 'south', target: 'room-013' },
    { direction: 'east', target: 'room-012' }, { direction: 'west', target: 'room-008' },
  ] },
]

export const ROOM_SPECS: RoomSpec[] = [
  {
    // Cellar: two ledges to hop between, blocks to shove into the spike corner.
    id: 'room-006', tint: 'purple', style: 'dungeon',
    exits: [{ direction: 'east', target: 'room-002' }, { direction: 'south', target: 'room-009' }],
    spawn: { x: 1, z: 1 },
    platforms: [{ x: 2, z: 2, height: 1 }, { x: 5, z: 2, height: 1 }],
    pushBlocks: [{ x: 3, z: 5 }, { x: 5, z: 5 }],
    spikes: [{ x: 1, z: 6 }, { x: 2, z: 6 }],
    guards: [{ from: { x: 1, z: 7 }, to: { x: 6, z: 7 } }],
  },
  {
    // Gate: a big central block with a guard sweeping the back row.
    id: 'room-007', tint: 'red', style: 'castle',
    exits: [{ direction: 'south', target: 'room-004' }, { direction: 'west', target: 'room-010' }],
    spawn: { x: 1, z: 4 },
    platforms: [{ x: 3, z: 3, height: 1 }, { x: 4, z: 3, height: 1 }, { x: 3, z: 4, height: 2 }, { x: 4, z: 4, height: 2 }],
    spikes: [{ x: 1, z: 6 }, { x: 6, z: 6 }],
    guards: [{ from: { x: 1, z: 1 }, to: { x: 6, z: 1 } }],
    movingPlatforms: [{ from: { x: 1, z: 2 }, to: { x: 6, z: 2 }, height: 2 }],
  },
  {
    // Pit: two spike rows with offset gaps, a ghost that closes in.
    id: 'room-008', tint: 'red', style: 'hazard',
    exits: [{ direction: 'north', target: 'room-001' }, { direction: 'east', target: 'room-005' }],
    spawn: { x: 4, z: 1 },
    spikes: [
      ...[0, 1, 2, 3, 5, 6, 7].map((x) => ({ x, z: 3 })),
      ...[0, 2, 3, 4, 5, 6, 7].map((x) => ({ x, z: 5 })),
    ],
    ghosts: [{ x: 6, z: 6 }],
    movingPlatforms: [{ from: { x: 1, z: 4 }, to: { x: 6, z: 4 }, height: 1 }],
  },
  {
    // Store: a two-step stair and a block to drag under the high ledge.
    id: 'room-009', tint: 'yellow', style: 'castle',
    exits: [{ direction: 'north', target: 'room-006' }, { direction: 'east', target: 'room-001' }],
    spawn: { x: 6, z: 1 },
    platforms: [{ x: 2, z: 3, height: 1 }, { x: 3, z: 3, height: 2 }, { x: 5, z: 5, height: 1 }],
    pushBlocks: [{ x: 1, z: 6 }],
    guards: [{ from: { x: 1, z: 2 }, to: { x: 6, z: 2 } }],
  },
  {
    // Gallery: four pillars for cover from two crossing guards.
    id: 'room-010', tint: 'green', style: 'tower',
    exits: [{ direction: 'south', target: 'room-003' }, { direction: 'west', target: 'room-002' }, { direction: 'east', target: 'room-007' }],
    spawn: { x: 1, z: 6 },
    platforms: [{ x: 2, z: 2, height: 1 }, { x: 5, z: 2, height: 1 }, { x: 2, z: 5, height: 1 }, { x: 5, z: 5, height: 1 }],
    pathGuards: [
      { path: [{ x: 1, z: 1 }, { x: 6, z: 1 }, { x: 6, z: 6 }, { x: 1, z: 6 }] },
      { path: [{ x: 3, z: 3 }, { x: 4, z: 3 }, { x: 4, z: 4 }, { x: 3, z: 4 }] },
    ],
  },
  {
    // Armoury: dead end packed with blocks; the high ledge needs two stacked.
    id: 'room-011', tint: 'blue', style: 'castle',
    exits: [{ direction: 'west', target: 'room-004' }],
    spawn: { x: 1, z: 4 },
    pushBlocks: [{ x: 2, z: 2 }, { x: 4, z: 2 }, { x: 2, z: 5 }, { x: 5, z: 5 }, { x: 3, z: 3 }],
    platforms: [{ x: 6, z: 1, height: 2 }],
    spikes: [{ x: 5, z: 6 }, { x: 6, z: 6 }],
  },
  {
    // Crypt: spikes in the far corner, a ghost and a guard on the near row.
    id: 'room-012', tint: 'purple', style: 'dungeon',
    exits: [{ direction: 'north', target: 'room-004' }, { direction: 'west', target: 'room-005' }],
    spawn: { x: 3, z: 4 },
    spikes: [{ x: 1, z: 1 }, { x: 2, z: 1 }, { x: 1, z: 2 }],
    platforms: [{ x: 5, z: 2, height: 1 }, { x: 6, z: 2, height: 1 }],
    ghosts: [{ x: 6, z: 6 }],
    guards: [{ from: { x: 1, z: 6 }, to: { x: 6, z: 6 } }],
  },
  {
    // Well: a dead-end staircase to climb, spikes guarding the block.
    id: 'room-013', tint: 'blue', style: 'tower',
    exits: [{ direction: 'north', target: 'room-005' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 1, z: 6, height: 1 }, { x: 2, z: 6, height: 2 }, { x: 3, z: 6, height: 3 }, { x: 3, z: 5, height: 2 }],
    pushBlocks: [{ x: 6, z: 2 }],
    spikes: [{ x: 5, z: 4 }, { x: 6, z: 4 }],
    movingPlatforms: [{ from: { x: 5, z: 6 }, to: { x: 5, z: 2 }, height: 1 }],
  },
]
