import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Grid } from '../engine/Grid'
import type { Torch } from './Torch'

const TILE_SIZE = 2

export interface Exit {
  direction: 'north' | 'south' | 'east' | 'west'
  targetRoomId: string
  entryX: number
  entryZ: number
}

export class Room {
  readonly id: string
  readonly grid: Grid
  readonly entities: Entity[] = []
  readonly lights: THREE.Light[] = []
  readonly exits: Exit[] = []
  readonly torches: Torch[] = []
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

  remove(e: Entity): void {
    const i = this.entities.indexOf(e)
    if (i >= 0) this.entities.splice(i, 1)
    if (e.object3D) this.group.remove(e.object3D)
  }

  addLight(light: THREE.Light): void {
    this.lights.push(light)
    this.group.add(light)
  }

  addExit(exit: Exit): void {
    this.exits.push(exit)
  }

  addTorch(torch: Torch): void {
    this.torches.push(torch)
    this.group.add(torch.group)
    this.group.add(torch.light)
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
    for (const torch of this.torches) torch.update(dt)
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
