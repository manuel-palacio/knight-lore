import type { BackdropPart } from '../engine/Backdrop'
import { Entity, type UpdateContext } from './Entity'
import { Grid } from '../engine/Grid'
import type { DecorKind } from '../engine/ColumnLooks'

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
  // Levels of its blocks drawn as themselves (a hedge, a gargoyle), by `x,z,level`.
  readonly decor = new Map<string, DecorKind>()
  spawnX = 0
  spawnZ = 0
  tint = 0xffd95a // default yellow; builders override per room
  // Walls, arches, gates and hedges, as the original draws them.
  backdrop: BackdropPart[] = []

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

  addDecor(gridX: number, gridZ: number, level: number, kind: DecorKind): void {
    this.decor.set(`${gridX},${gridZ},${level}`, kind)
  }

  decorAt(gridX: number, gridZ: number, level: number): DecorKind | undefined {
    return this.decor.get(`${gridX},${gridZ},${level}`)
  }

  addExit(exit: Exit): void {
    this.exits.push(exit)
  }

  // After a death: everything that moves goes back to its starting place.
  reset(): void {
    for (const e of this.entities) e.reset()
  }

  setSpawn(x: number, z: number): void {
    this.spawnX = x
    this.spawnZ = z
  }

  update(dt: number, sharedCtx: UpdateContext): void {
    const ctx = { ...sharedCtx, grid: this.grid, tileSize: TILE_SIZE, entities: this.entities }
    for (const e of this.entities) {
      if (e.active) e.update(dt, ctx)
    }
  }

  get tileSize(): number {
    return TILE_SIZE
  }
}
