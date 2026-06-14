import * as THREE from 'three'
import { buildRoomShell, addExitArch, addPlatform, addPatrolEnemy, attachOffsetMesh, tileCenter } from './shell'
import { Cauldron } from '../../game/Cauldron'
import { makeHeroMaterial, makeToonMaterial } from '../../game/Materials'
import type { RoomBuilder } from '../../game/RoomManager'

// The quest hub: cauldron on a raised 2×2 platform (height 1 — exactly
// jumpable), one guard patrolling in front of it.
export const buildRoom001: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-001', loader, 'yellow', ['north', 'east'])

  for (const [gx, gz] of [[3, 3], [4, 3], [3, 4], [4, 4]] as const) {
    addPlatform(room, gx, gz, 1)
  }

  // Cauldron: dark bowl sitting on the platform top, with a glowing rim ring
  // to mark it as the interaction target.
  const cauldron = new Cauldron()
  cauldron.position.set(8, 1, 8) // center of the 2×2 platform, on its top
  cauldron.renderPosition.copy(cauldron.position)
  const cauldronVisual = new THREE.Group()
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    makeToonMaterial(0x1a140e),
  )
  bowl.castShadow = true
  cauldronVisual.add(bowl)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.06, 8, 24),
    makeHeroMaterial(0xffaa44),
  )
  rim.rotation.x = -Math.PI / 2
  rim.position.y = 0.5
  cauldronVisual.add(rim)
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.2, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  halo.rotation.x = -Math.PI / 2
  halo.position.y = 0.6
  cauldronVisual.add(halo)
  attachOffsetMesh(cauldron, cauldronVisual, 0.5)
  room.add(cauldron)

  addPatrolEnemy(room, { x: 3, z: 11 }, { x: 13, z: 11 })

  room.addExit({ direction: 'north', targetRoomId: 'room-002', entryX: 8, entryZ: 15 })
  room.addExit({ direction: 'east', targetRoomId: 'room-003', entryX: 1, entryZ: 8 })
  addExitArch(room, 'north')
  addExitArch(room, 'east')
  room.setSpawn(tileCenter(4), tileCenter(0))
  return room
}
