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

  update(_dt: number, _ctx: UpdateContext): void {
    if (this.collected) this.active = false
  }

  collect(): void {
    this.collected = true
  }
}
