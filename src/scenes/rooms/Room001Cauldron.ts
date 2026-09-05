import * as THREE from 'three'
import { buildRoomShell, addExitArch, addPlatform, addPatrolEnemy, attachOffsetMesh, tileCenter } from './shell'
import { Cauldron } from '../../game/Cauldron'
import { addPickup } from './items'
import { makeHeroMaterial } from '../../game/Materials'
import type { RoomBuilder } from '../../game/RoomManager'

// The quest hub: cauldron on a raised 2×2 platform (height 1 — exactly
// jumpable), one guard patrolling in front of it.
export const buildRoom001: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-001', loader, 'yellow', ['north', 'east', 'south', 'west'], 'castle')

  for (const [gx, gz] of [[3, 3], [4, 3], [3, 4], [4, 4]] as const) {
    addPlatform(room, gx, gz, 1)
  }

  // Cauldron per cauldron.png: spherical body with a clear rim, and a
  // STARBURST CLUSTER of triangular spike-bubbles rising from the top —
  // not soft round puffs, sharp pyramidal teeth pointing up & outward.
  const cauldron = new Cauldron()
  cauldron.position.set(8, 1, 8)
  cauldron.renderPosition.copy(cauldron.position)
  const cauldronVisual = new THREE.Group()
  const ironMat = makeHeroMaterial(0xffaa44, 1.0)

  // Wide rim collar (thick torus, sits flat)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 10, 24), ironMat)
  rim.rotation.x = -Math.PI / 2
  rim.position.y = 0.5
  cauldronVisual.add(rim)

  // Round belly — main cauldron body
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 14), ironMat)
  belly.scale.set(1.05, 0.8, 1.05)
  belly.position.y = 0.28
  cauldronVisual.add(belly)

  // STARBURST steam cluster — short cones pointing up & outward in a
  // radial pattern, like the spike-burst in cauldron.png.
  const steamMat = makeHeroMaterial(0xfff0c0, 1.4)
  // Central plume
  const center = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), steamMat)
  center.position.y = 0.95
  cauldronVisual.add(center)
  // Six outward radial spikes around the central plume
  const RADIAL_COUNT = 6
  for (let i = 0; i < RADIAL_COUNT; i++) {
    const theta = (i / RADIAL_COUNT) * Math.PI * 2
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 5), steamMat)
    const r = 0.28
    spike.position.set(Math.cos(theta) * r, 0.78, Math.sin(theta) * r)
    // tilt outward (away from centre) by ~45 degrees
    const tiltAxis = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta))
    spike.setRotationFromAxisAngle(tiltAxis, -Math.PI / 4)
    cauldronVisual.add(spike)
  }
  attachOffsetMesh(cauldron, cauldronVisual, 0.5)
  room.add(cauldron)

  addPatrolEnemy(room, { x: 3, z: 11 }, { x: 13, z: 11 })
  addPickup(room, 'poison', 1, 6)

  room.addExit({ direction: 'north', targetRoomId: 'room-002', entryX: 8, entryZ: 15 })
  room.addExit({ direction: 'east', targetRoomId: 'room-003', entryX: 1, entryZ: 8 })
  addExitArch(room, 'north')
  addExitArch(room, 'east')
  room.addExit({ direction: 'south', targetRoomId: 'room-008', entryX: 8, entryZ: 1 })
  addExitArch(room, 'south')
  room.addExit({ direction: 'west', targetRoomId: 'room-009', entryX: 15, entryZ: 8 })
  addExitArch(room, 'west')
  room.setSpawn(tileCenter(4), tileCenter(0))
  return room
}
