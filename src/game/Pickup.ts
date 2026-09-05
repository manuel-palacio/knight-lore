import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

// Subtle floor-bob so a static prop is findable on the black floor. Applied
// at draw time only; the pickup-range check sees the authoritative position.
const BOB_SPEED = 2.5
const BOB_AMPLITUDE = 0.06

export class Pickup extends Entity {
  readonly id: string
  collected = false
  private bobPhase = 0

  constructor(id: string) {
    super()
    this.id = id
    this.categories = [Category.PICKUP_TRIGGER]
    this.extents.set(0.6, 0.6, 0.6)
  }

  update(dt: number, _ctx: UpdateContext): void {
    this.bobPhase += dt
  }

  collect(): void {
    this.collected = true
    this.active = false
  }

  dropAt(x: number, y: number, z: number): void {
    this.collected = false
    this.active = true
    this.position.set(x, y, z)
  }

  get bobOffset(): number {
    return Math.sin(this.bobPhase * BOB_SPEED) * BOB_AMPLITUDE
  }
}
