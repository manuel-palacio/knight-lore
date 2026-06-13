import * as THREE from 'three'
import { buildRoomShell, addExitArch, addPlatform, tileCenter } from './shell'
import { Cauldron } from '../../game/Cauldron'
import { PatrolEnemy } from '../../game/PatrolEnemy'
import { makeToonMaterial } from '../../game/Materials'
import type { RoomBuilder } from '../../game/RoomManager'

// The quest hub: cauldron on a raised 2×2 platform (height 1 — exactly
// jumpable), one guard patrolling in front of it.
export const buildRoom001: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-001', loader)

  for (const [gx, gz] of [[3, 3], [4, 3], [3, 4], [4, 4]] as const) {
    addPlatform(room, gx, gz, 1)
  }

  const cauldron = new Cauldron()
  cauldron.position.set(8, 1, 8) // center of the 2×2 platform, on its top
  cauldron.renderPosition.copy(cauldron.position)
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    makeToonMaterial(0x2d2620),
  )
  bowl.castShadow = true
  bowl.position.set(8, 1.5, 8)
  cauldron.object3D = bowl
  room.add(cauldron)

  const guard = new PatrolEnemy({ x: 3, z: 11 }, { x: 13, z: 11 })
  const guardMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
    makeToonMaterial(0x884444),
  )
  guardMesh.castShadow = true
  guard.object3D = guardMesh
  guardMesh.position.copy(guard.position)
  room.add(guard)

  room.addExit({ direction: 'north', targetRoomId: 'room-002', entryX: 8, entryZ: 15 })
  room.addExit({ direction: 'east', targetRoomId: 'room-003', entryX: 1, entryZ: 8 })
  addExitArch(room, 'north')
  addExitArch(room, 'east')
  room.setSpawn(tileCenter(4), tileCenter(0))
  return room
}
