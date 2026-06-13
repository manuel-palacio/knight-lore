import * as THREE from 'three'
import { Pickup } from '../../game/Pickup'
import { makeToonMaterial } from '../../game/Materials'
import type { Room } from '../../game/Room'
import { tileCenter } from './shell'

export type ItemId = 'goblet' | 'gem' | 'wine-bottle' | 'crystal-ball'

export function makeItemMesh(id: ItemId): THREE.Mesh {
  let mesh: THREE.Mesh
  switch (id) {
    case 'goblet':
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.4, 12), makeToonMaterial(0xd4af37))
      break
    case 'gem':
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), makeToonMaterial(0x44cc66))
      break
    case 'wine-bottle':
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.55, 12), makeToonMaterial(0x6a1530))
      break
    case 'crystal-ball':
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), makeToonMaterial(0x88bbee))
      break
  }
  mesh.castShadow = true
  return mesh
}

export function addPickup(room: Room, id: ItemId, gridX: number, gridZ: number, y = 0.4): Pickup {
  const pickup = new Pickup(id)
  pickup.object3D = makeItemMesh(id)
  pickup.position.set(tileCenter(gridX), y, tileCenter(gridZ))
  pickup.renderPosition.copy(pickup.position)
  pickup.object3D.position.copy(pickup.position)
  room.add(pickup)
  return pickup
}
