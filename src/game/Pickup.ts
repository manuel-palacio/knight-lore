import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

export class Pickup extends Entity {
  readonly id: string
  collected = false

  constructor(id: string) {
    super()
    this.id = id
    this.categories = [Category.PICKUP_TRIGGER]
    this.extents.set(0.6, 0.6, 0.6)
  }

  update(_dt: number, _ctx: UpdateContext): void {}

  collect(): void {
    this.collected = true
    // Deactivate immediately: once carried, the object3D is parented to the
    // carrier and positioned locally — a render-position update would
    // overwrite that local offset with the stale world position.
    this.active = false
  }
}
