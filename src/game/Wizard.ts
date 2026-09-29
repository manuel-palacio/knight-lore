import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { PIXELS_PER_BLOCK, PIXELS_PER_UNIT } from './Gravity'
import { topOverSquare } from './Holding'

// Melkhior, standing beside his cauldron (background part 0x9E): a box 10
// pixels across and 24 high, solid like everything in the room.
const HALF_ACROSS = 5 / PIXELS_PER_UNIT
export const WIZARD_TOP = 24 / PIXELS_PER_BLOCK

export class Wizard extends Entity {
  constructor(x: number, z: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.extents.set(2 * HALF_ACROSS, WIZARD_TOP, 2 * HALF_ACROSS)
    this.position.set(x, 0, z)
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    return topOverSquare(this.position, HALF_ACROSS, WIZARD_TOP, x, z, actorY)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}
