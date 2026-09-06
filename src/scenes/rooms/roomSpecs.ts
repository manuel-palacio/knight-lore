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
  cauldron?: Cell & { height: number }
  wizard?: Cell
  flames?: (Cell & { height: number })[]
  // Layout read off map.png by the detector: blocks and doors only so far.
  mapped?: boolean
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
// The five hand-built rooms are gone; every room is a spec now.
export const LEGACY_ROOM_LINKS: { id: string; exits: { direction: Direction; target: string }[] }[] = []

export const ROOM_SPECS: RoomSpec[] = [
  {
    // The wizard's room, read off map.png with the lattice detector: cauldron
    // on its block, Melkhior up-right of it, a diagonal pair of blocks behind
    // (one carries a flame), a block to the west, a diagonal pair in front.
    id: 'room-001', tint: 'yellow',
    exits: [{ direction: 'north', target: 'map-0--1' }, { direction: 'south', target: 'map-0-1' }, { direction: 'east', target: 'map-1-0' }, { direction: 'west', target: 'map--1-0' }],
    spawn: { x: 4, z: 1 },
    platforms: [
      { x: 1, z: 2, height: 1 }, { x: 2, z: 1, height: 1 },
      { x: 1, z: 5, height: 1 },
      { x: 5, z: 6, height: 1 }, { x: 6, z: 5, height: 1 },
    ],
    cauldron: { x: 4, z: 4, height: 0 },
    wizard: { x: 4, z: 2 },
  },
  {
    id: 'map-0--1', tint: 'purple', mapped: true,
    exits: [{ direction: 'south', target: 'room-001' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 3, z: 3, height: 2 }, { x: 3, z: 4, height: 3 }, { x: 3, z: 5, height: 3 }, { x: 4, z: 4, height: 3 }, { x: 4, z: 5, height: 3 }],
    spikes: [{ x: 2, z: 4 }, { x: 3, z: 0 }, { x: 4, z: 3 }, { x: 5, z: 3 }, { x: 5, z: 4 }],
  },
  {
    id: 'map--1-0', tint: 'blue', mapped: true,
    exits: [{ direction: 'north', target: 'map--1--1' }, { direction: 'south', target: 'map--1-1' }, { direction: 'east', target: 'room-001' }, { direction: 'west', target: 'map--2-0' }],
    spawn: { x: 4, z: 2 },
    platforms: [],
    spikes: [{ x: 1, z: 1 }, { x: 1, z: 3 }, { x: 1, z: 4 }, { x: 2, z: 3 }, { x: 3, z: 1 }, { x: 3, z: 4 }, { x: 4, z: 1 }, { x: 4, z: 4 }, { x: 5, z: 2 }],
    ghosts: [{ x: 3, z: 3 }],
  },
  {
    id: 'map-1-0', tint: 'blue', mapped: true,
    exits: [{ direction: 'west', target: 'room-001' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
    spikes: [{ x: 0, z: 3 }],
    flames: [{ x: 3, z: 2, height: 0 }],
  },
  {
    id: 'map-0-1', tint: 'green', mapped: true,
    exits: [{ direction: 'north', target: 'room-001' }, { direction: 'east', target: 'map-1-1' }, { direction: 'west', target: 'map--1-1' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
    spikes: [{ x: 0, z: 0 }, { x: 1, z: 3 }, { x: 1, z: 5 }, { x: 2, z: 1 }, { x: 3, z: 3 }, { x: 3, z: 5 }, { x: 4, z: 2 }, { x: 5, z: 1 }, { x: 5, z: 4 }, { x: 5, z: 6 }],
    pathGuards: [{ path: [{ x: 3, z: 5 }, { x: 5, z: 5 }] }],
  },
  {
    id: 'map--1--1', tint: 'green', mapped: true,
    exits: [{ direction: 'north', target: 'map--1--2' }, { direction: 'south', target: 'map--1-0' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
    spikes: [{ x: 1, z: 3 }, { x: 3, z: 0 }],
  },
  {
    id: 'map--2-0', tint: 'purple', mapped: true,
    exits: [{ direction: 'south', target: 'map--2-1' }, { direction: 'east', target: 'map--1-0' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 6, z: 7, height: 1 }],
    spikes: [{ x: 2, z: 4 }, { x: 3, z: 6 }],
    ghosts: [{ x: 7, z: 7 }],
  },
  {
    id: 'map--1-1', tint: 'purple', mapped: true,
    exits: [{ direction: 'north', target: 'map--1-0' }, { direction: 'south', target: 'map--1-2' }, { direction: 'east', target: 'map-0-1' }, { direction: 'west', target: 'map--2-1' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
  },
  {
    id: 'map-1-1', tint: 'purple', mapped: true,
    exits: [{ direction: 'east', target: 'map-2-1' }, { direction: 'west', target: 'map-0-1' }],
    spawn: { x: 4, z: 3 },
    platforms: [{ x: 2, z: 4, height: 1 }, { x: 3, z: 4, height: 2 }, { x: 5, z: 3, height: 1 }, { x: 5, z: 4, height: 1 }],
    spikes: [{ x: 2, z: 2 }, { x: 3, z: 2 }, { x: 3, z: 3 }, { x: 3, z: 5 }, { x: 4, z: 1 }, { x: 4, z: 2 }, { x: 4, z: 4 }, { x: 5, z: 5 }],
    balls: [{ from: { x: 2, z: 0 }, to: { x: 5, z: 0 } }],
  },
  {
    id: 'map--1--2', tint: 'purple', mapped: true,
    exits: [{ direction: 'north', target: 'map--1--3' }, { direction: 'south', target: 'map--1--1' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
    pickups: [{ x: 3, z: 3, item: 'boot' }],
  },
  {
    id: 'map--2-1', tint: 'yellow', mapped: true,
    exits: [{ direction: 'north', target: 'map--2-0' }, { direction: 'east', target: 'map--1-1' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
    spikes: [{ x: 2, z: 7 }, { x: 3, z: 6 }],
    pickups: [{ x: 3, z: 3, item: 'teacup' }],
  },
  {
    id: 'map-2-1', tint: 'blue', mapped: true,
    exits: [{ direction: 'south', target: 'map-2-2' }, { direction: 'west', target: 'map-1-1' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 0, z: 1, height: 2 }, { x: 0, z: 2, height: 1 }],
    spikes: [{ x: 6, z: 2 }, { x: 7, z: 1 }, { x: 7, z: 3 }],
    pickups: [{ x: 3, z: 3, item: 'poison' }],
  },
  {
    id: 'map--1-2', tint: 'green', mapped: true,
    exits: [{ direction: 'north', target: 'map--1-1' }],
    spawn: { x: 4, z: 2 },
    platforms: [],
    spikes: [{ x: 1, z: 1 }, { x: 2, z: 1 }, { x: 2, z: 4 }, { x: 3, z: 0 }, { x: 4, z: 1 }, { x: 5, z: 4 }],
    pathGuards: [{ path: [{ x: 2, z: 3 }, { x: 5, z: 3 }] }],
    pickups: [{ x: 3, z: 3, item: 'life' }],
  },
  {
    id: 'map--1--3', tint: 'green', mapped: true,
    exits: [{ direction: 'north', target: 'map--1--4' }, { direction: 'south', target: 'map--1--2' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 3, z: 1, height: 1 }],
    spikes: [{ x: 3, z: 0 }],
    ghosts: [{ x: 5, z: 1 }, { x: 3, z: 5 }],
    pickups: [{ x: 3, z: 3, item: 'wine-bottle' }],
  },
  {
    id: 'map-2-2', tint: 'yellow', mapped: true,
    exits: [{ direction: 'north', target: 'map-2-1' }, { direction: 'east', target: 'map-3-2' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
    pickups: [{ x: 3, z: 3, item: 'crystal-ball' }],
  },
  {
    id: 'map--1--4', tint: 'blue', mapped: true,
    exits: [{ direction: 'south', target: 'map--1--3' }],
    spawn: { x: 4, z: 1 },
    platforms: [],
    spikes: [{ x: 7, z: 2 }],
    flames: [{ x: 7, z: 0, height: 0 }],
    pickups: [{ x: 3, z: 3, item: 'goblet' }],
  },
  {
    id: 'map-3-2', tint: 'green', mapped: true,
    exits: [{ direction: 'west', target: 'map-2-2' }],
    spawn: { x: 4, z: 1 },
    platforms: [{ x: 4, z: 3, height: 2 }, { x: 4, z: 4, height: 2 }],
    spikes: [{ x: 0, z: 3 }],
    flames: [{ x: 3, z: 0, height: 0 }],
    pickups: [{ x: 3, z: 3, item: 'gem' }],
  },
]
