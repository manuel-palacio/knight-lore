import * as THREE from 'three'
import { topOverSquare, isStoodOn } from './Holding'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'

// The original's collapsing block (the room table's t22, handler at 0xB6A2):
// stood on, it turns to its crumbling graphic (0xB8, handler 0xBF2B), the
// next frame to the last (0xB9, 0xBF37), which takes it away: gone two
// frames after someone lands on it, and gone until the room is entered
// again. Like a table, it only supports from above.
export const VANISH_AFTER_FRAMES = 2

interface RiderCtx extends UpdateContext {
  playerPosition?: THREE.Vector3
}

export class VanishingBlock extends Entity {
  readonly height: number
  present = true
  private readonly footprint: number
  private countdown = -1
  private readonly clock = new FrameClock()

  constructor(gridX: number, gridZ: number, height: number, tileSize: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.height = height
    this.footprint = tileSize
    this.extents.set(tileSize, height, tileSize)
    this.position.set(gridX * tileSize + tileSize / 2, 0, gridZ * tileSize + tileSize / 2)
  }

  // Frames left before it crumbles, or -1 when it is not counting down.
  get framesUntilVanish(): number {
    return this.present ? this.countdown : -1
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    if (!this.present) return null
    return topOverSquare(this.position, this.footprint / 2, this.height, x, z, actorY)
  }

  override reset(): void {
    this.present = true
    this.countdown = -1
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const rider = (ctxRaw as RiderCtx).playerPosition
    if (this.present && this.countdown < 0 && rider && this.isStandingOn(rider)) this.countdown = VANISH_AFTER_FRAMES
    if (!this.present || this.countdown < 0) return
    this.countdown--
    if (this.countdown === 0) this.present = false
  }

  private isStandingOn(rider: THREE.Vector3): boolean {
    return isStoodOn(this, this.height, rider)
  }
}
