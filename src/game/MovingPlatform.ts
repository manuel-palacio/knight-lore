import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { StepClock, STEP_LENGTH } from '../engine/StepClock'

const FOOTPRINT = 2
const RIDER_TOLERANCE = 0.05

interface PlatformCtx extends UpdateContext {
  playerPosition?: THREE.Vector3
}

// A one-tile slab shuttling between two points on one axis, one step per
// step tick. Anything standing on its top surface rides along with it.
export class MovingPlatform extends Entity {
  readonly height: number
  private readonly from: { x: number; z: number }
  private readonly to: { x: number; z: number }
  private headingOut = true
  private readonly clock = new StepClock()

  constructor(from: { x: number; z: number }, to: { x: number; z: number }, height: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.extents.set(FOOTPRINT, height, FOOTPRINT)
    this.from = from
    this.to = to
    this.height = height
    this.position.set(from.x, 0, from.z)
    this.renderPosition.copy(this.position)
  }

  supportAt(x: number, z: number): number | null {
    const half = FOOTPRINT / 2
    const inside = Math.abs(x - this.position.x) <= half && Math.abs(z - this.position.z) <= half
    return inside ? this.height : null
  }

  private atTarget(): boolean {
    const target = this.headingOut ? this.to : this.from
    return target.x === this.position.x && target.z === this.position.z
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as PlatformCtx
    if (this.atTarget()) this.headingOut = !this.headingOut
    const target = this.headingOut ? this.to : this.from
    const dx = Math.sign(target.x - this.position.x) * STEP_LENGTH
    const dz = Math.sign(target.z - this.position.z) * STEP_LENGTH
    const rider = ctx.playerPosition
    const riding = rider !== undefined && this.supportAt(rider.x, rider.z) !== null && Math.abs(rider.y - this.height) < RIDER_TOLERANCE
    this.position.x += dx
    this.position.z += dz
    if (riding && rider) {
      rider.x += dx
      rider.z += dz
    }
  }
}
