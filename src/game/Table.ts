import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

// A tabletop on legs: stand on it, or walk underneath. Support only counts
// for an actor already near the top, so the floor beneath stays walkable.
const TOP_TOLERANCE = 0.5

export class Table extends Entity {
  readonly height: number
  private readonly footprint: number

  constructor(gridX: number, gridZ: number, height: number, tileSize: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.height = height
    this.footprint = tileSize
    this.extents.set(tileSize, height, tileSize)
    this.position.set(gridX * tileSize + tileSize / 2, 0, gridZ * tileSize + tileSize / 2)
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    const half = this.footprint / 2
    const inside = Math.abs(x - this.position.x) <= half && Math.abs(z - this.position.z) <= half
    return inside && actorY >= this.height - TOP_TOLERANCE ? this.height : null
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}
