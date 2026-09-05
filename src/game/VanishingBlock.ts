import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { StepClock } from '../engine/StepClock'

// A block that crumbles a few steps after someone stands on it and grows
// back later. Like a table, it only supports from above.
export const VANISH_AFTER_STEPS = 8
export const RETURN_AFTER_STEPS = 24
const TOP_TOLERANCE = 0.5
const RIDER_TOLERANCE = 0.05

interface RiderCtx extends UpdateContext {
  playerPosition?: THREE.Vector3
}

export class VanishingBlock extends Entity {
  readonly height: number
  present = true
  private readonly footprint: number
  private countdown = -1
  private readonly clock = new StepClock()

  constructor(gridX: number, gridZ: number, height: number, tileSize: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.height = height
    this.footprint = tileSize
    this.extents.set(tileSize, height, tileSize)
    this.position.set(gridX * tileSize + tileSize / 2, 0, gridZ * tileSize + tileSize / 2)
  }

  // Steps left before it crumbles, or -1 when it is not counting down.
  get stepsUntilVanish(): number {
    return this.present ? this.countdown : -1
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    if (!this.present) return null
    const half = this.footprint / 2
    const inside = Math.abs(x - this.position.x) <= half && Math.abs(z - this.position.z) <= half
    return inside && actorY >= this.height - TOP_TOLERANCE ? this.height : null
  }

  override reset(): void {
    this.present = true
    this.countdown = -1
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const rider = (ctxRaw as RiderCtx).playerPosition
    if (this.present && this.countdown < 0 && rider && this.isStandingOn(rider)) this.countdown = VANISH_AFTER_STEPS
    if (this.countdown < 0) return
    this.countdown--
    if (this.countdown > 0) return
    if (this.present) {
      this.present = false
      this.countdown = RETURN_AFTER_STEPS
    } else {
      this.present = true
      this.countdown = -1
    }
  }

  private isStandingOn(rider: THREE.Vector3): boolean {
    return this.supportAt(rider.x, rider.z, rider.y) !== null && Math.abs(rider.y - this.height) < RIDER_TOLERANCE
  }
}
