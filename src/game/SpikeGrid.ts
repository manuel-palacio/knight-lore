import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Room } from './Room'

// Dense forest of teeth per tile (4x4 = 16) on a low base plate. Matches
// the original Knight Lore hazard tiles in 5.png where each cell is
// packed with pyramid teeth — a thicket, not a few cones.

const SPIKE_COLOR = 0xff4060
const BASE_COLOR = 0xa02040
const GRID = 4
const TEETH_BASE_RADIUS = 0.13
const TEETH_HEIGHT = 0.7

// One geometry/material shared across every tooth in every Spike tile.
// Saves both upload bandwidth and per-frame draw setup.
const sharedToothGeometry = new THREE.ConeGeometry(TEETH_BASE_RADIUS, TEETH_HEIGHT, 5)
const sharedToothMaterial = new THREE.MeshBasicMaterial({ color: SPIKE_COLOR })
const sharedBaseMaterial = new THREE.MeshBasicMaterial({ color: BASE_COLOR })

function makeSpikeMesh(tileSize: number): THREE.Group {
  const group = new THREE.Group()

  // Low base plate — a brick-red square the teeth sit on. Reads as a
  // marked hazard zone under the mono pass.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(tileSize - 0.1, 0.1, tileSize - 0.1),
    sharedBaseMaterial,
  )
  base.position.y = 0.05
  group.add(base)

  // 4x4 teeth, evenly spaced inside the tile. Slight per-tooth height
  // variation gives the cluster a jagged silhouette.
  const span = tileSize - 0.4
  const step = span / (GRID - 1)
  const origin = -span / 2
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const tooth = new THREE.Mesh(sharedToothGeometry, sharedToothMaterial)
      const wobble = 0.85 + 0.3 * (((r * 7 + c * 3) % 11) / 11)
      tooth.position.set(origin + c * step, 0.1 + (TEETH_HEIGHT * wobble) / 2, origin + r * step)
      tooth.scale.set(1, wobble, 1)
      group.add(tooth)
    }
  }

  return group
}

export class Spike extends Entity {
  constructor(gridX: number, gridZ: number, tileSize: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(tileSize - 0.2, TEETH_HEIGHT, tileSize - 0.2)
    this.position.set(
      gridX * tileSize + tileSize / 2,
      0,
      gridZ * tileSize + tileSize / 2,
    )
    this.renderPosition.copy(this.position)
    this.object3D = makeSpikeMesh(tileSize)
    this.object3D.position.copy(this.position)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}

export function placeSpikes(room: Room, tiles: { x: number; z: number }[]): void {
  for (const t of tiles) {
    room.add(new Spike(t.x, t.z, room.tileSize))
  }
}
