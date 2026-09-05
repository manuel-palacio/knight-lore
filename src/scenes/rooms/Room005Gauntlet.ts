import { buildRoomShell, tileCenter } from './shell'
import { placeSpikes } from '../../game/SpikeGrid'
import { GhostEnemy } from '../../game/GhostEnemy'
import { addPickup } from './items'
import type { RoomBuilder } from '../../game/RoomManager'

// Two staggered spike rows (gap at x=4 then x=1) with a pursuing ghost.
export const buildRoom005: RoomBuilder = async () => {
  const room = buildRoomShell('room-005', 'purple')
  addPickup(room, 'crystal-ball', 6, 6)
  addPickup(room, 'teacup', 1, 6)
  placeSpikes(room, [1, 2, 3, 5, 6].map((x) => ({ x, z: 3 })))
  placeSpikes(room, [2, 3, 4, 5, 6].map((x) => ({ x, z: 5 })))

  room.add(new GhostEnemy(tileCenter(6), tileCenter(1)))

  room.addExit({ direction: 'north', targetRoomId: 'room-003', entryX: 8, entryZ: 15 })
  room.addExit({ direction: 'south', targetRoomId: 'room-013', entryX: 8, entryZ: 1 })
  room.addExit({ direction: 'east', targetRoomId: 'room-012', entryX: 1, entryZ: 8 })
  room.addExit({ direction: 'west', targetRoomId: 'room-008', entryX: 15, entryZ: 8 })
  room.setSpawn(tileCenter(4), tileCenter(0))
  return room
}
