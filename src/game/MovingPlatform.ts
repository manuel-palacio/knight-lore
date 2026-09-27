import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'

const FOOTPRINT = 2
// The original's moving blocks (handlers at 0xB6B1 and 0xB6B9) move one pixel
// a frame of its clock (FrameClock): an eighth of a unit.
export const PLATFORM_STEP = 1 / 8
const RIDER_TOLERANCE = 0.05
const TOP_TOLERANCE = 0.5

interface PlatformCtx extends UpdateContext {
  playerPosition?: THREE.Vector3
  playerExtents?: THREE.Vector3
}

// A one-block slab shuttling between two points on one axis, one stride a
// frame, its top at `height`. Anything standing on its top surface rides
// along with it. It moves through the original's collision routine (0xCB45,
// 0xCB9A), which checks it against him too: it waits while he is in its way,
// and does not push him.
export class MovingPlatform extends Entity {
  readonly height: number
  readonly bottom: number
  private readonly from: { x: number; z: number }
  private readonly to: { x: number; z: number }
  private headingOut = true
  private readonly clock = new FrameClock()

  constructor(from: { x: number; z: number }, to: { x: number; z: number }, height: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.extents.set(FOOTPRINT, height, FOOTPRINT)
    this.from = from
    this.to = to
    this.height = height
    this.bottom = height - 1
    this.position.set(from.x, 0, from.z)
  }

  // Only an actor near the top is supported, so the floor under a high
  // platform stays walkable.
  supportAt(x: number, z: number, actorY: number = this.height): number | null {
    const half = FOOTPRINT / 2
    const inside = Math.abs(x - this.position.x) <= half && Math.abs(z - this.position.z) <= half
    return inside && actorY >= this.height - TOP_TOLERANCE ? this.height : null
  }

  override reset(): void {
    this.position.set(this.from.x, 0, this.from.z)
    this.headingOut = true
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
    const dx = Math.sign(target.x - this.position.x) * PLATFORM_STEP
    const dz = Math.sign(target.z - this.position.z) * PLATFORM_STEP
    const rider = ctx.playerPosition
    if (rider && ctx.playerExtents && this.wouldHit(rider, ctx.playerExtents, dx, dz)) return
    const riding = rider !== undefined && this.supportAt(rider.x, rider.z) !== null && Math.abs(rider.y - this.height) < RIDER_TOLERANCE
    this.position.x += dx
    this.position.z += dz
    if (riding && rider) {
      rider.x += dx
      rider.z += dz
    }
  }

  private wouldHit(body: THREE.Vector3, size: THREE.Vector3, dx: number, dz: number): boolean {
    const reachX = (FOOTPRINT + size.x) / 2
    const reachZ = (FOOTPRINT + size.z) / 2
    const across = Math.abs(body.x - (this.position.x + dx)) < reachX && Math.abs(body.z - (this.position.z + dz)) < reachZ
    return across && body.y < this.height && body.y + size.y > this.bottom
  }
}
