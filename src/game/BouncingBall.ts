import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, fallOneStep, groundUnder, type GroundCtx } from './Gravity'

// The original's bouncing ball (the room table's t2, t12, t24 and t28;
// handler at 0xB865) bounces where it stands. It rises two pixels a frame
// until it is 32 pixels above where the room's first ball started, then
// falls under gravity onto what is under it, and rises again. Touching it
// costs a life.
export const RISE_PER_FRAME_PX = 2
export const BOUNCE_ABOVE_FIRST_PX = 32
const HALF_WIDTH = 0.4

export class BouncingBall extends Entity {
  heightPx: number
  speedPx = 0
  private rising = false
  private readonly startPx: number
  private readonly topPx: number
  private readonly clock = new FrameClock()

  // `height` is where it starts and `top` how high it rises, both in blocks.
  constructor(at: { x: number; z: number }, height: number, top: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.8, 0.8, 0.8)
    this.startPx = Math.round(height * PIXELS_PER_BLOCK)
    this.topPx = Math.round(top * PIXELS_PER_BLOCK)
    this.heightPx = this.startPx
    this.position.set(at.x, height, at.z)
  }

  override reset(): void {
    this.heightPx = this.startPx
    this.speedPx = 0
    this.rising = false
    this.position.y = this.heightPx / PIXELS_PER_BLOCK
  }

  update(_dt: number, ctx: UpdateContext): void {
    if (!this.clock.tick()) return
    if (this.rising) this.rise()
    else this.rising = fallOneStep(this, this.groundPx(ctx as GroundCtx))
    this.position.y = this.heightPx / PIXELS_PER_BLOCK
  }

  private rise(): void {
    this.speedPx = RISE_PER_FRAME_PX
    this.heightPx += RISE_PER_FRAME_PX
    if (this.heightPx > this.topPx) this.rising = false
  }

  private groundPx(ctx: GroundCtx): number {
    const ground = groundUnder(ctx, this.position.x, this.position.z, HALF_WIDTH, this.heightPx / PIXELS_PER_BLOCK)
    return Math.round(ground * PIXELS_PER_BLOCK)
  }
}
