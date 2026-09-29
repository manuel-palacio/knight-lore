import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, PIXELS_PER_UNIT, fallOneStep } from './Gravity'
import type { Pickup } from './Pickup'

// A pixel a frame along each axis (0xC1F4-0xC213).
const GLIDE_STEP = 1 / PIXELS_PER_UNIT

// A charm put down up on the cauldron (0xC0C6: in its room, from two blocks
// up) is the cauldron's (graphics 0x68-0x6E, handler 0xC1F1): it glides a
// pixel a frame along each axis to the cauldron's middle, then drops through
// it to the floor, where the cauldron takes it (see CharmHands).
export class SinkingCharm extends Entity {
  sunk = false
  moved = false
  private readonly clock = new FrameClock()
  private fallSpeedPx = 0

  constructor(readonly charm: Pickup, private readonly middle: { x: number; z: number }) {
    super()
    this.categories = [Category.DECORATIVE]
    this.extents.copy(charm.extents)
    this.position.copy(charm.position)
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (this.sunk || !this.clock.tick()) return
    const dx = glideToward(this.position.x, this.middle.x)
    const dz = glideToward(this.position.z, this.middle.z)
    this.moved = dx !== 0 || dz !== 0
    if (this.moved) {
      this.position.x += dx
      this.position.z += dz
    } else this.sink()
  }

  private sink(): void {
    const body = { heightPx: Math.round(this.position.y * PIXELS_PER_BLOCK), speedPx: this.fallSpeedPx }
    this.sunk = fallOneStep(body, 0)
    this.fallSpeedPx = body.speedPx
    this.position.y = body.heightPx / PIXELS_PER_BLOCK
  }
}

function glideToward(from: number, to: number): number {
  return Math.sign(to - from) * Math.min(GLIDE_STEP, Math.abs(to - from))
}
