import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { StepClock } from '../engine/StepClock'

// The original's spiked ball (the room table's t18, and t19, the kind that
// bobs): a hazard at a height in the middle of its cell. Touching it costs a
// life; a high one can be walked under.
export const SPIKED_BALL_BOB = 1
const BOB_STEPS = 22
const SIZE = 1.2

export class SpikedBall extends Entity {
  private readonly base: number
  private readonly bobs: boolean
  private bobStep = 0
  private readonly clock = new StepClock()

  constructor(cell: { x: number; z: number }, height: number, bobs: boolean, tileSize: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(SIZE, SIZE, SIZE)
    this.base = height
    this.bobs = bobs
    this.position.set(cell.x * tileSize + tileSize / 2, height, cell.z * tileSize + tileSize / 2)
  }

  override reset(): void {
    this.bobStep = 0
    this.position.y = this.base
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (!this.bobs || !this.clock.tick()) return
    this.bobStep = (this.bobStep + 1) % BOB_STEPS
    this.position.y = this.base + Math.sin((this.bobStep / BOB_STEPS) * Math.PI) * SPIKED_BALL_BOB
  }
}
