import { buildRoomShell, addExitArch, addPatrolEnemy, tileCenter } from './shell'
import { addPickup } from './items'
import type { RoomBuilder } from '../../game/RoomManager'

// Crossroads: gem guarded by two patrols whose paths cross — slip between
// their timing. Three exits.
export const buildRoom003: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-003', loader)
  addPickup(room, 'gem', 1, 1)
  addPatrolEnemy(room, { x: 3, z: 5 }, { x: 13, z: 5 })
  addPatrolEnemy(room, { x: 9, z: 3 }, { x: 9, z: 13 })

  room.addExit({ direction: 'west', targetRoomId: 'room-001', entryX: 15, entryZ: 8 })
  room.addExit({ direction: 'east', targetRoomId: 'room-004', entryX: 1, entryZ: 8 })
  room.addExit({ direction: 'south', targetRoomId: 'room-005', entryX: 8, entryZ: 1 })
  addExitArch(room, 'west')
  addExitArch(room, 'east')
  addExitArch(room, 'south')
  room.setSpawn(tileCenter(0), tileCenter(4))
  return room
}
