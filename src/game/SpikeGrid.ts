import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Room } from './Room'

const TEETH_HEIGHT = 0.7

// One tile of spikes. Drawn by the renderer as a bed of needles.
export class Spike extends Entity {
  constructor(gridX: number, gridZ: number, tileSize: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(tileSize - 0.2, TEETH_HEIGHT, tileSize - 0.2)
    this.position.set(gridX * tileSize + tileSize / 2, 0, gridZ * tileSize + tileSize / 2)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}

export function placeSpikes(room: Room, tiles: { x: number; z: number }[]): void {
  for (const t of tiles) {
    room.add(new Spike(t.x, t.z, room.tileSize))
  }
}
