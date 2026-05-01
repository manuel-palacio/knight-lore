import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

export class Door extends Entity {
  readonly side: 'north' | 'south' | 'east' | 'west'
  readonly opensWhen: () => boolean
  open = false
  onOpen: () => void = () => {}

  constructor(side: 'north' | 'south' | 'east' | 'west', opensWhen: () => boolean) {
    super()
    this.side = side
    this.opensWhen = opensWhen
    this.categories = [Category.SOLID_WORLD]
    this.extents.set(2, 2.4, 0.2)
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (!this.open && this.opensWhen()) {
      this.open = true
      this.categories = [Category.DECORATIVE]
      this.onOpen()
    }
  }
}
