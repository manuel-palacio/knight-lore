import { FrameClock } from '../engine/StepClock'

// Now and then Sabreman (and the wolf) glance aside, walking or standing,
// as the body's handler has it (0xCDDA): on a frame of the original's clock
// the random byte (0x5BA5) is below 2, the body is drawn as its view's sixth
// graphic, at 0xFE or above as its seventh, and held eight frames more.
// `glance` is 0 or 1 for those, null while he looks ahead.
const RARE_LOW = 2
const RARE_HIGH = 0xfe
const HELD_FRAMES = 8

export class HeadTurn {
  glance: 0 | 1 | null = null
  private framesLeft = 0
  private readonly clock = new FrameClock()
  private readonly random: () => number

  constructor(random: () => number = Math.random) {
    this.random = random
  }

  update(): void {
    if (!this.clock.tick()) return
    if (this.framesLeft > 0) {
      this.framesLeft--
      return
    }
    const byte = Math.floor(this.random() * 256)
    this.glance = byte < RARE_LOW ? 0 : byte >= RARE_HIGH ? 1 : null
    if (this.glance !== null) this.framesLeft = HELD_FRAMES
  }
}
