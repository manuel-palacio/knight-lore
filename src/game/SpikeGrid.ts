import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Room } from './Room'

// Low enough that every frame of a jump arc clears it: a jump from anywhere on
// the tile before a spike bed carries over it; walking or landing on it hurts.
const TEETH_HEIGHT = 0.45

// One tile of spikes. Drawn by the renderer as a bed of needles.
export class Spike extends Entity {
  constructor(gridX: number, gridZ: number, tileSize: number, height = 0) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(tileSize - 0.2, TEETH_HEIGHT, tileSize - 0.2)
    this.position.set(gridX * tileSize + tileSize / 2, height, gridZ * tileSize + tileSize / 2)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}

// A tile with a height is a spike bed on top of a block that tall.
export function placeSpikes(room: Room, tiles: { x: number; z: number; height?: number }[]): void {
  for (const t of tiles) {
    room.add(new Spike(t.x, t.z, room.tileSize, t.height ?? 0))
  }
}
