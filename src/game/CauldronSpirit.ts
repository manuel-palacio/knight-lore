import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_UNIT } from './Gravity'
import type { GameState } from './GameState'

// 4 pixels a frame along each axis (0xB942), faster than his 3.
export const SPIRIT_STEP = 4 / PIXELS_PER_UNIT
const FLOAT_HEIGHT = 0.8
// Set up with the room (0xB8A9) at the cauldron's floor, it rises two pixels a
// frame to 0xA0 before it looks at him (0xB8EE): sixteen frames.
export const RISE_FRAMES = (0xa0 - 0x80) / 2

interface SpiritCtx extends UpdateContext {
  state: GameState
  playerPosition: THREE.Vector3
}

// The cauldron room is no place for the wolf. The sparkle over the cauldron
// (graphic 0xA0, handler 0xB8DA), once risen, looks each frame at what he is,
// and the first frame he is the wolf (0xB8FD) it turns (graphic 0xA4, handler
// 0xB92C) and makes straight for him (0xB965), through anything. Turned, it
// stays so, by day as by night, until the room is set up again: entered, or
// after a death, when it rises afresh and the wolf has those frames to be gone
// by the door he came in by.
export class CauldronSpirit extends Entity {
  risen = false
  private risingFrames = RISE_FRAMES
  private readonly home: { x: number; z: number }
  private readonly clock = new FrameClock()

  constructor(x: number, z: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.9, 1.4, 0.9)
    this.home = { x, z }
    this.position.set(x, FLOAT_HEIGHT, z)
  }

  override reset(): void {
    this.risen = false
    this.risingFrames = RISE_FRAMES
    this.position.set(this.home.x, FLOAT_HEIGHT, this.home.z)
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as SpiritCtx
    if (this.risingFrames > 0) {
      this.risingFrames--
      return
    }
    if (this.risen) this.chase(ctx.playerPosition)
    else this.risen = ctx.state.form === 'werewolf'
  }

  private chase(player: THREE.Vector3): void {
    this.position.x += stepToward(this.position.x, player.x)
    this.position.z += stepToward(this.position.z, player.z)
  }
}

function stepToward(from: number, to: number): number {
  return Math.sign(to - from) * Math.min(SPIRIT_STEP, Math.abs(to - from))
}
