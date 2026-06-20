import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

// Subtle floor-bob: makes a static prop findable against tiled brick floors
// without distorting its pixel art. Amplitude is well below a tile (~6cm out
// of 2m), period ~2.5s — reads as a slow float, not a hover.
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
    // Deactivate immediately: once carried, the object3D is parented to the
    // carrier and positioned locally — a render-position update would
    // overwrite that local offset with the stale world position.
    this.active = false
  }

  // Bob is applied at RENDER time on top of the simulation position — the
  // pickup-range check still sees the authoritative floor position.
  override updateRenderPosition(alpha = 0.18): void {
    super.updateRenderPosition(alpha)
    if (this.object3D) {
      this.object3D.position.y += Math.sin(this.bobPhase * BOB_SPEED) * BOB_AMPLITUDE
    }
  }
}
