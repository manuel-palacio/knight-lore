import { buildRoomShell, addExitArch, addPatrolEnemy, addPlatform, addPushBlock, tileCenter } from './shell'
import { Spike } from '../../game/SpikeGrid'
import { addPickup } from './items'
import type { RoomBuilder } from '../../game/RoomManager'

// Wine bottle on a height-2 platform: unreachable from the floor (jump
// apex 1.0). Push a 1.0-high slab next to it, climb the slab, jump up.
export const buildRoom004: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-004', loader, 'green', ['west'], 'dungeon')
  addPlatform(room, 5, 5, 2)
  addPickup(room, 'wine-bottle', 5, 5, 2.4)
  addPushBlock(room, 2, 5)
  addPushBlock(room, 3, 2)
  room.add(new Spike(6, 6, room.tileSize))
  addPatrolEnemy(room, { x: 3, z: 9 }, { x: 13, z: 9 }, 1.0)

  room.addExit({ direction: 'west', targetRoomId: 'room-003', entryX: 15, entryZ: 8 })
  addExitArch(room, 'west')
  room.setSpawn(tileCenter(0), tileCenter(4))
  return room
}
