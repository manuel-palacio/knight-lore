import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Grid } from '../engine/Grid'

const TILE_SIZE = 2

export class Room {
  readonly id: string
  readonly grid: Grid
  readonly entities: Entity[] = []
  readonly lights: THREE.Light[] = []
  readonly group: THREE.Group
  spawnX = 0
  spawnZ = 0

  constructor(id: string, width: number, depth: number) {
    this.id = id
    this.grid = new Grid(width, depth)
    this.group = new THREE.Group()
  }

  add(e: Entity): void {
    this.entities.push(e)
    if (e.object3D) this.group.add(e.object3D)
  }

  addLight(light: THREE.Light): void {
    this.lights.push(light)
    this.group.add(light)
  }

  setSpawn(x: number, z: number): void {
    this.spawnX = x
    this.spawnZ = z
  }

  update(dt: number, sharedCtx: UpdateContext): void {
    const ctx = { ...sharedCtx, grid: this.grid, tileSize: TILE_SIZE }
    for (const e of this.entities) {
      if (e.active) e.update(dt, ctx)
    }
  }

  updateRenderPositions(alpha = 0.18): void {
    for (const e of this.entities) {
      if (e.active) e.updateRenderPosition(alpha)
    }
  }

  get tileSize(): number {
    return TILE_SIZE
  }
}
