import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, fallOneStep, groundUnder, type GroundCtx } from './Gravity'
import type { GameState } from './GameState'

// The original's spiked ball (the room table's t18, and t19, the same ball
// hung four blocks higher; handler at 0xB7A9): a hazard in the middle of its
// cell. Each frame it may let go, one chance in sixteen, and fall under
// gravity onto what is under it, where it stays. Every ball in a room rolls
// the same number in the same frame and the first to take the turn keeps it,
// so only the room's first ball (`drops`) ever falls. In the original's
// odd-numbered rooms it waits until something is picked up or put down
// there (`waits`). Touching it costs a life; a high one can be walked under.
export const DROP_CHANCE = 16 / 256
const SIZE = 1.2

export interface SpikedBallOptions {
  drops?: boolean
  waits?: boolean
  random?: () => number
}

export class SpikedBall extends Entity {
  heightPx: number
  speedPx = 0
  private falling = false
  private heldBack: boolean
  private carriedWhenEntered: string | null = null
  private readonly startPx: number
  private readonly drops: boolean
  private readonly waits: boolean
  private readonly random: () => number
  private readonly clock = new FrameClock()

  constructor(cell: { x: number; z: number }, height: number, tileSize: number, options: SpikedBallOptions = {}) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(SIZE, SIZE, SIZE)
    this.startPx = Math.round(height * PIXELS_PER_BLOCK)
    this.heightPx = this.startPx
    this.drops = options.drops ?? false
    this.waits = options.waits ?? false
    this.heldBack = this.waits
    this.random = options.random ?? Math.random
    this.position.set(cell.x * tileSize + tileSize / 2, height, cell.z * tileSize + tileSize / 2)
  }

  override reset(): void {
    this.heightPx = this.startPx
    this.speedPx = 0
    this.falling = false
    this.heldBack = this.waits
    this.carriedWhenEntered = null
    this.position.y = this.heightPx / PIXELS_PER_BLOCK
  }

  update(_dt: number, ctx: UpdateContext): void {
    if (!this.drops || !this.clock.tick()) return
    if (this.falling) this.falling = !fallOneStep(this, this.groundPx(ctx as GroundCtx))
    else if (this.mayLetGo(ctx) && this.random() < DROP_CHANCE) this.falling = true
    this.position.y = this.heightPx / PIXELS_PER_BLOCK
  }

  private mayLetGo(ctx: UpdateContext): boolean {
    if (!this.heldBack) return true
    const carried = ((ctx as { state?: GameState }).state?.inventory ?? []).join()
    this.carriedWhenEntered ??= carried
    this.heldBack = carried === this.carriedWhenEntered
    return !this.heldBack
  }

  private groundPx(ctx: GroundCtx): number {
    return Math.round(groundUnder(ctx, this.position.x, this.position.z, SIZE / 2, this.heightPx / PIXELS_PER_BLOCK) * PIXELS_PER_BLOCK)
  }
}
