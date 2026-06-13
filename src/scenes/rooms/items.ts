import * as THREE from 'three'
import { Pickup } from '../../game/Pickup'
import { makeHeroMaterial } from '../../game/Materials'
import type { Room } from '../../game/Room'
import { tileCenter } from './shell'

export type ItemId = 'goblet' | 'gem' | 'wine-bottle' | 'crystal-ball'

const ITEM_COLOR: Record<ItemId, number> = {
  'goblet': 0xffd95a,
  'gem': 0x66ff88,
  'wine-bottle': 0xff5577,
  'crystal-ball': 0xaaddff,
}

// Items glow (emissive) and float inside a Group so the per-frame entity
// render-position update (which copies onto the Group) can't clobber the
// mesh's local bob/rotation offsets.
export function makeItemMesh(id: ItemId): THREE.Object3D {
  const group = new THREE.Group()
  const mat = makeHeroMaterial(ITEM_COLOR[id])
  let mesh: THREE.Mesh
  switch (id) {
    case 'goblet':
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.5, 12), mat)
      break
    case 'gem':
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), mat)
      break
    case 'wine-bottle':
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.65, 12), mat)
      break
    case 'crystal-ball':
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat)
      break
  }
  mesh.castShadow = true
  group.add(mesh)

  // Soft halo — a billboard-ish ring around the item, additive blend, low alpha.
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.55, 24),
    new THREE.MeshBasicMaterial({
      color: ITEM_COLOR[id],
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  halo.rotation.x = -Math.PI / 2
  halo.position.y = -0.18
  group.add(halo)

  return group
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
