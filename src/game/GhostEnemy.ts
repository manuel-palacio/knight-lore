import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_UNIT, fitsAt, type GroundCtx } from './Gravity'

// The original's ghost (the room table's t9, handler at 0xC5C8) hunts
// nobody. It drifts on a diagonal, three or four pixels a frame on each axis
// (entries 4-7 of the table at 0xC64E), and whenever a wall or a block stops
// it on either axis, or it stands still, it picks a new heading at random.
// Man or wolf, day or night, it is the same; touching it costs a life.
export const GHOST_SPEEDS_PX = [-3, 3, -4, 4]
const FLOAT_HEIGHT = 0.8
const HALF_WIDTH = 0.75

export class GhostEnemy extends Entity {
  heading = { x: 0, z: 0 }
  private readonly home: { x: number; z: number }
  private readonly random: () => number
  private readonly clock = new FrameClock()

  constructor(x: number, z: number, random: () => number = Math.random) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.9, 1.4, 0.9)
    this.home = { x, z }
    this.random = random
    this.position.set(x, FLOAT_HEIGHT, z)
  }

  override reset(): void {
    this.position.set(this.home.x, FLOAT_HEIGHT, this.home.z)
    this.heading = { x: 0, z: 0 }
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as GroundCtx
    const movedX = this.tryMove(ctx, this.heading.x, 0)
    const movedZ = this.tryMove(ctx, 0, this.heading.z)
    const still = this.heading.x === 0 && this.heading.z === 0
    if (still || !movedX || !movedZ) this.heading = { x: this.randomSpeed(), z: this.randomSpeed() }
  }

  private tryMove(ctx: GroundCtx, dx: number, dz: number): boolean {
    const x = this.position.x + dx
    const z = this.position.z + dz
    if (!fitsAt(ctx, x, z, HALF_WIDTH, 0)) return false
    this.position.x = x
    this.position.z = z
    return true
  }

  private randomSpeed(): number {
    return GHOST_SPEEDS_PX[Math.floor(this.random() * GHOST_SPEEDS_PX.length)]! / PIXELS_PER_UNIT
  }
}
