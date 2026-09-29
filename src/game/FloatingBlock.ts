import { Entity, type UpdateContext } from './Entity'
import { topOverSquare } from './Holding'
import { Category } from '../engine/categories'

// A block that hangs in the air with nothing under it, as the original's
// stepping stones and door lintels do: it holds from above, and can be walked
// under. `bottom` is its underside, in blocks from the floor.

export class FloatingBlock extends Entity {
  readonly bottom: number
  readonly top: number
  private readonly half: number

  constructor(gridX: number, gridZ: number, bottom: number, tileSize: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.bottom = bottom
    this.top = bottom + 1
    this.half = tileSize / 2
    this.extents.set(tileSize, 1, tileSize)
    this.position.set(gridX * tileSize + tileSize / 2, bottom, gridZ * tileSize + tileSize / 2)
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    return topOverSquare(this.position, this.half, this.top, x, z, actorY)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}
