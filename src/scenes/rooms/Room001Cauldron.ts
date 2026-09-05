import { buildRoomShell, addPlatform, addPatrolEnemy, tileCenter } from './shell'
import { Cauldron } from '../../game/Cauldron'
import type { RoomBuilder } from '../../game/RoomManager'

// The quest hub: cauldron on a raised 2×2 platform (height 1 — exactly
// jumpable), one guard patrolling in front of it.
export const buildRoom001: RoomBuilder = async () => {
  const room = buildRoomShell('room-001', 'yellow')

  for (const [gx, gz] of [[3, 3], [4, 3], [3, 4], [4, 4]] as const) {
    addPlatform(room, gx, gz, 1)
  }

  const cauldron = new Cauldron()
  cauldron.position.set(8, 1, 8)
  room.add(cauldron)

  addPatrolEnemy(room, { x: 3, z: 11 }, { x: 13, z: 11 })

  room.addExit({ direction: 'north', targetRoomId: 'room-002', entryX: 8, entryZ: 15 })
  room.addExit({ direction: 'east', targetRoomId: 'room-003', entryX: 1, entryZ: 8 })
  room.addExit({ direction: 'south', targetRoomId: 'room-008', entryX: 8, entryZ: 1 })
  room.addExit({ direction: 'west', targetRoomId: 'room-009', entryX: 15, entryZ: 8 })
  room.setSpawn(tileCenter(4), tileCenter(0))
  return room
}
