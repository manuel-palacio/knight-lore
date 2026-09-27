import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock, StepClock } from '../engine/StepClock'
import { PIXELS_PER_UNIT, fitsAt, type GroundCtx } from './Gravity'

interface FlameCtx extends GroundCtx {
  entities?: Entity[]
}

// A flame on the floor or on a block: a hazard that flickers and moves to and
// fro along one axis, two pixels a frame of the original's clock, turning
// back when a wall or a block stops it (type 10, handler 0xB80F, along the
// original's y, our z; type 20, 0xB7ED, along x), or when it meets another
// flame. It keeps to the level it burns on.
export const FLAME_STEP_PX = 2
const FRAMES = 3
const HALF_WIDTH = 0.4
const EDGE = 1e-6

export type FlameAxis = 'x' | 'z'

export class Flame extends Entity {
  frame = 0
  private readonly axis: FlameAxis
  private readonly home: { x: number; z: number }
  private heading = 1
  private readonly flicker = new StepClock()
  private readonly clock = new FrameClock()

  constructor(x: number, y: number, z: number, axis: FlameAxis) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.8, 1.0, 0.8)
    this.position.set(x, y, z)
    this.axis = axis
    this.home = { x, z }
  }

  override reset(): void {
    this.position.set(this.home.x, this.position.y, this.home.z)
    this.heading = 1
  }

  update(_dt: number, ctx: UpdateContext): void {
    if (this.flicker.tick()) this.frame = (this.frame + 1) % FRAMES
    if (this.clock.tick() && !this.tryMove(ctx as FlameCtx)) this.heading = -this.heading
  }

  private tryMove(ctx: FlameCtx): boolean {
    const step = (this.heading * FLAME_STEP_PX) / PIXELS_PER_UNIT
    const x = this.position.x + (this.axis === 'x' ? step : 0)
    const z = this.position.z + (this.axis === 'z' ? step : 0)
    if (!fitsAt(ctx, x, z, HALF_WIDTH, this.position.y) || !this.groundedAt(ctx, x, z) || this.meetsFlameAt(ctx, x, z)) return false
    this.position.x = x
    this.position.z = z
    return true
  }

  private meetsFlameAt(ctx: FlameCtx, x: number, z: number): boolean {
    const reach = 2 * HALF_WIDTH - EDGE
    return (ctx.entities ?? []).some(
      (e) => e !== this && e instanceof Flame && Math.abs(e.position.x - x) < reach && Math.abs(e.position.z - z) < reach && Math.abs(e.position.y - this.position.y) < 1,
    )
  }

  private groundedAt(ctx: GroundCtx, x: number, z: number): boolean {
    const { grid, tileSize } = ctx
    if (!grid || !tileSize || this.position.y <= 0) return true
    const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: x + sx * (HALF_WIDTH - EDGE), z: z + sz * (HALF_WIDTH - EDGE) })))
    return corners.every((c) => grid.supportHeight(Math.floor(c.x / tileSize), Math.floor(c.z / tileSize)) >= this.position.y - EDGE)
  }
}
