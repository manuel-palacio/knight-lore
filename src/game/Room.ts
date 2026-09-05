import { Entity, type UpdateContext } from './Entity'
import { Grid } from '../engine/Grid'

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
  readonly exits: Exit[] = []
  spawnX = 0
  spawnZ = 0
  tint = 0xffd95a // default yellow; builders override per room

  constructor(id: string, width: number, depth: number) {
    this.id = id
    this.grid = new Grid(width, depth)
  }

  add(e: Entity): void {
    this.entities.push(e)
  }

  remove(e: Entity): void {
    const i = this.entities.indexOf(e)
    if (i >= 0) this.entities.splice(i, 1)
  }

  addExit(exit: Exit): void {
    this.exits.push(exit)
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

  get tileSize(): number {
    return TILE_SIZE
  }
}
