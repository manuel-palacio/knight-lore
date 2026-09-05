import { buildRoomShell, addPlatform, addPushBlock, tileCenter } from './shell'
import type { RoomBuilder } from '../../game/RoomManager'

// Tutorial room: goblet in the far corner, one solid block to walk around,
// one push block to discover pushing. Exit south to the cauldron room.
export const buildRoom002: RoomBuilder = async () => {
  const room = buildRoomShell('room-002', 'yellow')
  addPlatform(room, 4, 4, 2) // central obstacle, too tall to climb from floor
  addPushBlock(room, 1, 3)
  room.addExit({ direction: 'south', targetRoomId: 'room-001', entryX: 8, entryZ: 1 })
  room.addExit({ direction: 'west', targetRoomId: 'room-006', entryX: 15, entryZ: 8 })
  room.addExit({ direction: 'east', targetRoomId: 'room-010', entryX: 1, entryZ: 8 })
  room.addExit({ direction: 'north', targetRoomId: 'room-022', entryX: 8, entryZ: 15 })
  room.setSpawn(tileCenter(2), tileCenter(2))
  return room
}
