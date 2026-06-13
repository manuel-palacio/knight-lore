import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { makeToonMaterial } from './Materials'
import type { Room } from './Room'

const SPIKE_COLOR = 0xcc4488

function makeSpikeMesh(): THREE.Group {
  const group = new THREE.Group()
  const mat = makeToonMaterial(SPIKE_COLOR)
  const offsets = [
    [0, 0],
    [-0.55, -0.55],
    [0.55, -0.55],
    [-0.55, 0.55],
    [0.55, 0.55],
  ]
  for (const [ox, oz] of offsets) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 6), mat)
    cone.position.set(ox!, 0.4, oz!)
    cone.castShadow = true
    group.add(cone)
  }
  return group
}

export class Spike extends Entity {
  constructor(gridX: number, gridZ: number, tileSize: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(1.2, 0.8, 1.2)
    this.position.set(
      gridX * tileSize + tileSize / 2,
      0,
      gridZ * tileSize + tileSize / 2,
    )
    this.renderPosition.copy(this.position)
    this.object3D = makeSpikeMesh()
    this.object3D.position.copy(this.position)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}

export function placeSpikes(room: Room, tiles: { x: number; z: number }[]): void {
  for (const t of tiles) {
    room.add(new Spike(t.x, t.z, room.tileSize))
  }
}
