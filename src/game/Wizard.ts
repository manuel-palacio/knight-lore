import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

// Melkhior, standing beside his cauldron. Scenery only.
export class Wizard extends Entity {
  constructor(x: number, z: number) {
    super()
    this.categories = [Category.DECORATIVE]
    this.extents.set(0.8, 2.6, 0.8)
    this.position.set(x, 0, z)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}
