import * as THREE from 'three'
import { buildRoomShell, addExitArch, tileCenter } from './shell'
import { placeSpikes } from '../../game/SpikeGrid'
import { GhostEnemy } from '../../game/GhostEnemy'
import { makeHeroMaterial } from '../../game/Materials'
import { addPickup } from './items'
import type { RoomBuilder } from '../../game/RoomManager'

// Two staggered spike rows (gap at x=4 then x=1) with a pursuing ghost.
export const buildRoom005: RoomBuilder = async (loader, _state) => {
  const room = await buildRoomShell('room-005', loader, 'purple', ['north', 'south', 'east', 'west'], 'hazard')
  addPickup(room, 'crystal-ball', 6, 6)
  addPickup(room, 'teacup', 1, 6)
  placeSpikes(room, [1, 2, 3, 5, 6].map((x) => ({ x, z: 3 })))
  placeSpikes(room, [2, 3, 4, 5, 6].map((x) => ({ x, z: 5 })))

  // Ghost: glowing pale blue sphere. Already floats at FLOAT_HEIGHT (no sink).
  const ghost = new GhostEnemy(tileCenter(6), tileCenter(1))
  const mat = makeHeroMaterial(0xaaccff)
  mat.transparent = true
  mat.opacity = 0.85
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), mat)
  mesh.castShadow = true
  ghost.object3D = mesh
  mesh.position.copy(ghost.position)
  room.add(ghost)

  room.addExit({ direction: 'north', targetRoomId: 'room-003', entryX: 8, entryZ: 15 })
  addExitArch(room, 'north')
  room.addExit({ direction: 'south', targetRoomId: 'room-013', entryX: 8, entryZ: 1 })
  addExitArch(room, 'south')
  room.addExit({ direction: 'east', targetRoomId: 'room-012', entryX: 1, entryZ: 8 })
  addExitArch(room, 'east')
  room.addExit({ direction: 'west', targetRoomId: 'room-008', entryX: 15, entryZ: 8 })
  addExitArch(room, 'west')
  room.setSpawn(tileCenter(4), tileCenter(0))
  return room
}
