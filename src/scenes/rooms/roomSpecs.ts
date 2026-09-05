import type { RoomTint } from './shell'
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
  exits: { direction: Direction; target: string }[]
  spawn: Cell
  platforms?: (Cell & { height: number })[]
  pushBlocks?: Cell[]
  spikes?: Cell[]
  guards?: { from: Cell; to: Cell; speed?: number }[]
  ghosts?: Cell[]
  pickups?: (Cell & { item: ItemId; y?: number })[]
  movingPlatforms?: { from: Cell; to: Cell; height: number }[]
  pathGuards?: { path: Cell[] }[]
  tables?: (Cell & { height: number })[]
  vanishing?: (Cell & { height: number })[]
  balls?: { from: Cell; to: Cell }[]
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
    { direction: 'south', target: 'room-001' }, { direction: 'west', target: 'room-006' },
    { direction: 'east', target: 'room-010' }, { direction: 'north', target: 'room-022' },
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
    pickups: [{ x: 6, z: 6, item: 'boot' }],
    id: 'room-006', tint: 'purple',
    exits: [{ direction: 'east', target: 'room-002' }, { direction: 'south', target: 'room-009' }, { direction: 'west', target: 'room-014' }],
    spawn: { x: 1, z: 1 },
    platforms: [{ x: 2, z: 2, height: 1 }, { x: 5, z: 2, height: 1 }],
    pushBlocks: [{ x: 3, z: 5 }, { x: 5, z: 5 }],
    spikes: [{ x: 1, z: 6 }, { x: 2, z: 6 }],
    guards: [{ from: { x: 1, z: 7 }, to: { x: 6, z: 7 } }],
  },
  {
    // Gate: a big central block with a guard sweeping the back row.
    pickups: [{ x: 6, z: 1, item: 'goblet' }],
    id: 'room-007', tint: 'red',
    exits: [{ direction: 'south', target: 'room-004' }, { direction: 'west', target: 'room-010' }, { direction: 'east', target: 'room-017' }],
    spawn: { x: 1, z: 4 },
    platforms: [{ x: 3, z: 3, height: 1 }, { x: 4, z: 3, height: 1 }, { x: 3, z: 4, height: 2 }, { x: 4, z: 4, height: 2 }],
    spikes: [{ x: 1, z: 6 }, { x: 6, z: 6 }],
    guards: [{ from: { x: 1, z: 1 }, to: { x: 6, z: 1 } }],
    movingPlatforms: [{ from: { x: 1, z: 2 }, to: { x: 6, z: 2 }, height: 2 }],
  },
  {
    // Pit: two spike rows with offset gaps, a ghost that closes in.
    pickups: [{ x: 1, z: 7, item: 'poison' }],
    id: 'room-008', tint: 'red',
    exits: [{ direction: 'north', target: 'room-001' }, { direction: 'east', target: 'room-005' }, { direction: 'west', target: 'room-016' }, { direction: 'south', target: 'room-019' }],
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
    pickups: [{ x: 6, z: 6, item: 'gem' }],
    id: 'room-009', tint: 'yellow',
    exits: [{ direction: 'north', target: 'room-006' }, { direction: 'east', target: 'room-001' }, { direction: 'west', target: 'room-015' }, { direction: 'south', target: 'room-016' }],
    spawn: { x: 6, z: 1 },
    platforms: [{ x: 2, z: 3, height: 1 }, { x: 3, z: 3, height: 2 }, { x: 5, z: 5, height: 1 }],
    tables: [{ x: 5, z: 3, height: 1.5 }, { x: 6, z: 3, height: 1.5 }],
    pushBlocks: [{ x: 1, z: 6 }],
    guards: [{ from: { x: 1, z: 2 }, to: { x: 6, z: 2 } }],
  },
  {
    // Gallery: four pillars for cover from two crossing guards.
    pickups: [{ x: 4, z: 4, item: 'teacup' }],
    id: 'room-010', tint: 'green',
    exits: [{ direction: 'south', target: 'room-003' }, { direction: 'west', target: 'room-002' }, { direction: 'east', target: 'room-007' }, { direction: 'north', target: 'room-023' }],
    spawn: { x: 1, z: 6 },
    platforms: [{ x: 2, z: 2, height: 1 }, { x: 5, z: 2, height: 1 }, { x: 2, z: 5, height: 1 }, { x: 5, z: 5, height: 1 }],
    pathGuards: [
      { path: [{ x: 1, z: 1 }, { x: 6, z: 1 }, { x: 6, z: 6 }, { x: 1, z: 6 }] },
    ],
    balls: [{ from: { x: 1, z: 3 }, to: { x: 6, z: 3 } }],
  },
  {
    // Armoury: dead end packed with blocks; the high ledge needs two stacked.
    pickups: [{ x: 6, z: 1, item: 'wine-bottle', y: 2.4 }],
    id: 'room-011', tint: 'blue',
    exits: [{ direction: 'west', target: 'room-004' }, { direction: 'north', target: 'room-017' }, { direction: 'south', target: 'room-018' }],
    spawn: { x: 1, z: 4 },
    pushBlocks: [{ x: 2, z: 2 }, { x: 4, z: 2 }, { x: 2, z: 5 }, { x: 5, z: 5 }, { x: 3, z: 3 }],
    platforms: [{ x: 6, z: 1, height: 2 }],
    spikes: [{ x: 5, z: 6 }, { x: 6, z: 6 }],
  },
  {
    // Crypt: spikes in the far corner, a ghost and a guard on the near row.
    pickups: [{ x: 6, z: 1, item: 'life' }],
    id: 'room-012', tint: 'purple',
    exits: [{ direction: 'north', target: 'room-004' }, { direction: 'west', target: 'room-005' }, { direction: 'east', target: 'room-018' }, { direction: 'south', target: 'room-020' }],
    spawn: { x: 3, z: 4 },
    spikes: [{ x: 1, z: 1 }, { x: 2, z: 1 }, { x: 1, z: 2 }],
    platforms: [{ x: 5, z: 2, height: 1 }, { x: 6, z: 2, height: 1 }],
    ghosts: [{ x: 6, z: 6 }],
    guards: [{ from: { x: 1, z: 6 }, to: { x: 6, z: 6 } }],
  },
  {
    // Well: a dead-end staircase to climb, spikes guarding the block.
    pickups: [{ x: 3, z: 6, item: 'crystal-ball', y: 3.4 }],
    id: 'room-013', tint: 'blue',
    exits: [{ direction: 'north', target: 'room-005' }, { direction: 'west', target: 'room-019' }, { direction: 'east', target: 'room-020' }, { direction: 'south', target: 'room-021' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 1, z: 6, height: 1 }, { x: 3, z: 6, height: 3 }, { x: 3, z: 5, height: 2 }],
    vanishing: [{ x: 2, z: 6, height: 2 }, { x: 1, z: 4, height: 1 }],
    pushBlocks: [{ x: 6, z: 2 }],
    spikes: [{ x: 5, z: 4 }, { x: 6, z: 4 }],
    movingPlatforms: [{ from: { x: 5, z: 6 }, to: { x: 5, z: 2 }, height: 1 }],
  },
  {
    // Buttery: tables to hop across, a ball under them.
    id: 'room-014', tint: 'yellow',
    exits: [{ direction: 'east', target: 'room-006' }, { direction: 'south', target: 'room-015' }],
    spawn: { x: 1, z: 1 },
    tables: [{ x: 2, z: 3, height: 1.5 }, { x: 4, z: 3, height: 1.5 }, { x: 6, z: 3, height: 1.5 }],
    balls: [{ from: { x: 1, z: 5 }, to: { x: 6, z: 5 } }],
    spikes: [{ x: 6, z: 6 }],
  },
  {
    // Oubliette: a guard loop around a crumbling walkway.
    id: 'room-015', tint: 'purple',
    exits: [{ direction: 'east', target: 'room-009' }, { direction: 'north', target: 'room-014' }],
    spawn: { x: 6, z: 6 },
    vanishing: [{ x: 2, z: 2, height: 1 }, { x: 3, z: 2, height: 1 }, { x: 4, z: 2, height: 1 }],
    platforms: [{ x: 1, z: 2, height: 1 }, { x: 5, z: 2, height: 1 }],
    pathGuards: [{ path: [{ x: 1, z: 5 }, { x: 6, z: 5 }, { x: 6, z: 6 }, { x: 1, z: 6 }] }],
  },
  {
    // Vault: push blocks hemmed in by spikes, a ghost drifting in.
    id: 'room-016', tint: 'blue',
    exits: [{ direction: 'north', target: 'room-009' }, { direction: 'east', target: 'room-008' }],
    spawn: { x: 4, z: 1 },
    pushBlocks: [{ x: 2, z: 3 }, { x: 5, z: 3 }],
    spikes: [{ x: 1, z: 5 }, { x: 2, z: 5 }, { x: 5, z: 5 }, { x: 6, z: 5 }],
    ghosts: [{ x: 6, z: 6 }],
    platforms: [{ x: 3, z: 6, height: 1 }],
  },
  {
    // Rampart: a high moving platform over a bed of spikes.
    id: 'room-017', tint: 'red',
    exits: [{ direction: 'west', target: 'room-007' }, { direction: 'south', target: 'room-011' }],
    spawn: { x: 1, z: 1 },
    spikes: [2, 3, 4, 5].map((x) => ({ x, z: 4 })),
    movingPlatforms: [{ from: { x: 1, z: 3 }, to: { x: 6, z: 3 }, height: 1 }],
    platforms: [{ x: 1, z: 6, height: 1 }, { x: 6, z: 6, height: 1 }],
    guards: [{ from: { x: 1, z: 2 }, to: { x: 6, z: 2 } }],
  },
  {
    // Kennel: two balls crossing, a table to wait on.
    id: 'room-018', tint: 'green',
    exits: [{ direction: 'north', target: 'room-011' }, { direction: 'west', target: 'room-012' }],
    spawn: { x: 4, z: 1 },
    balls: [{ from: { x: 1, z: 3 }, to: { x: 6, z: 3 } }, { from: { x: 6, z: 5 }, to: { x: 1, z: 5 } }],
    tables: [{ x: 3, z: 4, height: 1.5 }],
    spikes: [{ x: 6, z: 6 }, { x: 1, z: 6 }],
  },
  {
    // Undercroft: crumbling bridge over spikes with a ghost behind.
    id: 'room-019', tint: 'purple',
    exits: [{ direction: 'north', target: 'room-008' }, { direction: 'east', target: 'room-013' }],
    spawn: { x: 4, z: 1 },
    spikes: [1, 2, 3, 4, 5, 6].map((x) => ({ x, z: 5 })),
    vanishing: [{ x: 2, z: 5, height: 1 }, { x: 4, z: 5, height: 1 }],
    platforms: [{ x: 1, z: 6, height: 1 }],
    ghosts: [{ x: 6, z: 7 }],
  },
  {
    // Tower foot: a stair and a loop guard on the landing.
    id: 'room-020', tint: 'blue',
    exits: [{ direction: 'north', target: 'room-012' }, { direction: 'west', target: 'room-013' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 6, z: 6, height: 1 }, { x: 5, z: 6, height: 2 }, { x: 4, z: 6, height: 3 }],
    pathGuards: [{ path: [{ x: 1, z: 3 }, { x: 5, z: 3 }, { x: 5, z: 4 }, { x: 1, z: 4 }] }],
    pushBlocks: [{ x: 2, z: 6 }],
  },
  {
    // Well bottom: dead end guarded by balls, one block to climb out.
    id: 'room-021', tint: 'green',
    exits: [{ direction: 'north', target: 'room-013' }],
    spawn: { x: 4, z: 1 },
    balls: [{ from: { x: 1, z: 4 }, to: { x: 6, z: 4 } }],
    platforms: [{ x: 3, z: 6, height: 1 }, { x: 4, z: 6, height: 1 }],
    spikes: [{ x: 1, z: 6 }, { x: 6, z: 6 }],
    pushBlocks: [{ x: 6, z: 2 }],
  },
  {
    // Gatehouse: guards crossing under tables.
    id: 'room-022', tint: 'yellow',
    exits: [{ direction: 'south', target: 'room-002' }, { direction: 'east', target: 'room-023' }],
    spawn: { x: 1, z: 6 },
    tables: [{ x: 2, z: 2, height: 1.5 }, { x: 5, z: 2, height: 1.5 }],
    pathGuards: [{ path: [{ x: 1, z: 3 }, { x: 6, z: 3 }] }],
    guards: [{ from: { x: 6, z: 5 }, to: { x: 1, z: 5 } }],
  },
  {
    // Battlements: platform ride between two ledges, spikes below.
    id: 'room-023', tint: 'red',
    exits: [{ direction: 'south', target: 'room-010' }, { direction: 'west', target: 'room-022' }],
    spawn: { x: 1, z: 6 },
    platforms: [{ x: 1, z: 2, height: 2 }, { x: 6, z: 2, height: 2 }],
    movingPlatforms: [{ from: { x: 2, z: 2 }, to: { x: 5, z: 2 }, height: 2 }],
    spikes: [2, 3, 4, 5].map((x) => ({ x, z: 2 })),
    vanishing: [{ x: 1, z: 4, height: 1 }],
  },
]
