import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { StepClock, STEP_LENGTH } from '../engine/StepClock'

// A ball that bounces along a line between two points, one step per step
// tick, rising and falling on a fixed period. Touching it costs a life.
export const BOUNCE_HEIGHT = 1.0
const BOUNCE_STEPS = 8

export class BouncingBall extends Entity {
  private readonly from: { x: number; z: number }
  private readonly to: { x: number; z: number }
  private headingOut = true
  private bounceStep = 0
  private readonly clock = new StepClock()

  constructor(from: { x: number; z: number }, to: { x: number; z: number }) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.8, 0.8, 0.8)
    this.from = from
    this.to = to
    this.position.set(from.x, 0, from.z)
  }

  override reset(): void {
    this.position.set(this.from.x, 0, this.from.z)
    this.headingOut = true
    this.bounceStep = 0
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (!this.clock.tick()) return
    if (this.atTarget()) this.headingOut = !this.headingOut
    const target = this.headingOut ? this.to : this.from
    this.position.x += Math.sign(target.x - this.position.x) * STEP_LENGTH
    this.position.z += Math.sign(target.z - this.position.z) * STEP_LENGTH
    this.bounceStep = (this.bounceStep + 1) % BOUNCE_STEPS
    this.position.y = Math.sin((this.bounceStep / BOUNCE_STEPS) * Math.PI) * BOUNCE_HEIGHT
  }

  private atTarget(): boolean {
    const target = this.headingOut ? this.to : this.from
    return target.x === this.position.x && target.z === this.position.z
  }
}
