import { buildRoomShell, addExitArch, addPlatform, addPushBlock, tileCenter } from './shell'
import { addPickup } from './items'
import type { RoomBuilder } from '../../game/RoomManager'

// Tutorial room: goblet in the far corner, one solid block to walk around,
// one push block to discover pushing. Exit south to the cauldron room.
export const buildRoom002: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-002', loader, 'yellow', ['south', 'west', 'east'], 'castle')
  addPickup(room, 'goblet', 6, 1)
  addPlatform(room, 4, 4, 2) // central obstacle, too tall to climb from floor
  addPushBlock(room, 1, 3)
  room.addExit({ direction: 'south', targetRoomId: 'room-001', entryX: 8, entryZ: 1 })
  addExitArch(room, 'south')
  room.addExit({ direction: 'west', targetRoomId: 'room-006', entryX: 15, entryZ: 8 })
  addExitArch(room, 'west')
  room.addExit({ direction: 'east', targetRoomId: 'room-010', entryX: 1, entryZ: 8 })
  addExitArch(room, 'east')
  room.setSpawn(tileCenter(2), tileCenter(2))
  return room
}
