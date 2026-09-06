import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { StepClock } from '../engine/StepClock'

// A burning brazier on the floor or on a block: a fixed hazard that flickers.
const FRAMES = 3

export class Flame extends Entity {
  frame = 0
  private readonly clock = new StepClock()

  constructor(x: number, y: number, z: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.8, 1.0, 0.8)
    this.position.set(x, y, z)
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (this.clock.tick()) this.frame = (this.frame + 1) % FRAMES
  }
}
