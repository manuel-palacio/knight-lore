import type { RoomBuilder } from '../../game/RoomManager'
import { buildRoom001 } from './Room001Cauldron'
import { buildRoom002 } from './Room002Start'
import { buildRoom003 } from './Room003Hub'
import { buildRoom004 } from './Room004BlockPuzzle'
import { buildRoom005 } from './Room005Gauntlet'

export const ROOM_BUILDERS = new Map<string, RoomBuilder>([
  ['room-001', buildRoom001],
  ['room-002', buildRoom002],
  ['room-003', buildRoom003],
  ['room-004', buildRoom004],
  ['room-005', buildRoom005],
])

export const START_ROOM = 'room-002'
