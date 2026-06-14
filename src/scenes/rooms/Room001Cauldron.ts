import * as THREE from 'three'
import { buildRoomShell, addExitArch, addPlatform, addPatrolEnemy, attachOffsetMesh, tileCenter } from './shell'
import { Cauldron } from '../../game/Cauldron'
import { makeHeroMaterial } from '../../game/Materials'
import type { RoomBuilder } from '../../game/RoomManager'

// The quest hub: cauldron on a raised 2×2 platform (height 1 — exactly
// jumpable), one guard patrolling in front of it.
export const buildRoom001: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-001', loader, 'yellow', ['north', 'east'])

  for (const [gx, gz] of [[3, 3], [4, 3], [3, 4], [4, 4]] as const) {
    addPlatform(room, gx, gz, 1)
  }

  // Cauldron: wide-rimmed iron pot with three legs and a bubbling cluster
  // of steam puffs above it — see 1.png. All bright materials so the mono
  // shader paints them in the room tint instead of dropping them to black.
  const cauldron = new Cauldron()
  cauldron.position.set(8, 1, 8)
  cauldron.renderPosition.copy(cauldron.position)
  const cauldronVisual = new THREE.Group()
  const ironMat = makeHeroMaterial(0xffaa44, 1.0)

  // Wide rim collar (thick torus, sits flat)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.12, 10, 24), ironMat)
  rim.rotation.x = -Math.PI / 2
  rim.position.y = 0.55
  cauldronVisual.add(rim)

  // Belly (slightly squashed sphere)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.68, 18, 14), ironMat)
  belly.scale.set(1, 0.7, 1)
  belly.position.y = 0.3
  cauldronVisual.add(belly)

  // Three short legs at 120° apart
  const legMat = makeHeroMaterial(0xffaa44, 0.9)
  for (let i = 0; i < 3; i++) {
    const theta = i * (Math.PI * 2 / 3) + Math.PI / 6
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.12), legMat)
    leg.position.set(Math.cos(theta) * 0.42, 0.05, Math.sin(theta) * 0.42)
    cauldronVisual.add(leg)
  }

  // Bubbling cluster — 7 small puffs in a roughly conical pile above the rim.
  const steamMat = makeHeroMaterial(0xfff0c0, 1.2)
  const bubbles: [number, number, number, number][] = [
    [0, 0.85, 0, 0.16],
    [0.18, 0.78, 0, 0.13],
    [-0.16, 0.8, 0.08, 0.12],
    [0.05, 1.05, 0.12, 0.14],
    [-0.1, 1.0, -0.1, 0.11],
    [0.13, 1.18, -0.06, 0.10],
    [-0.04, 1.32, 0.04, 0.09],
  ]
  for (const [bx, by, bz, br] of bubbles) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(br, 8, 6), steamMat)
    b.position.set(bx, by, bz)
    cauldronVisual.add(b)
  }
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
