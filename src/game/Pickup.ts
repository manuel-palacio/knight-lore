import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

// Subtle floor-bob so a static prop is findable on the black floor. Applied
// at draw time only; the pickup-range check sees the authoritative position.
const BOB_SPEED = 2.5
const BOB_AMPLITUDE = 0.06

// A charm lying on the floor is something to stand on, as in the original:
// drop one and climb it to reach a block too high to jump to from the floor.
// Like a table, it holds from above and does not stop anyone walking into it.
export const CHARM_HEIGHT = 1
const FOOTPRINT_HALF = 1
const TOP_TOLERANCE = 0.5
// Charms hover this far above what they lie on (see addPickup and dropAt callers).
const HOVER = 0.4

export class Pickup extends Entity {
  readonly id: string
  // The room the charm was placed in when the castle was built.
  readonly homeRoomId: string
  collected = false
  private bobPhase = 0

  constructor(id: string, homeRoomId: string) {
    super()
    this.id = id
    this.homeRoomId = homeRoomId
    this.categories = [Category.PICKUP_TRIGGER]
    this.extents.set(0.6, 0.6, 0.6)
  }

  update(dt: number, _ctx: UpdateContext): void {
    this.bobPhase += dt
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    if (this.collected) return null
    const inside = Math.abs(x - this.position.x) <= FOOTPRINT_HALF && Math.abs(z - this.position.z) <= FOOTPRINT_HALF
    const top = this.position.y - HOVER + CHARM_HEIGHT
    return inside && actorY >= top - TOP_TOLERANCE ? top : null
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
