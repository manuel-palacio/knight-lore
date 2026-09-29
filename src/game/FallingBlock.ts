import * as THREE from 'three'
import { topOverSquare, isStoodOn } from './Holding'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, groundUnder, type GroundCtx } from './Gravity'

// The original's falling block (the room table's t21, handler at 0xB683):
// while someone stands on it, it sinks a pixel a frame, carrying him down,
// until it rests on what is under it. It stays where it stopped until the
// room is entered again. Like a table, it only holds from above.
export const SINK_PER_FRAME_PX = 1

interface RiderCtx extends GroundCtx {
  playerPosition?: THREE.Vector3
}

export class FallingBlock extends Entity {
  topPx: number
  private readonly startPx: number
  private readonly half: number
  private readonly clock = new FrameClock()

  // `height` is the height of its top, in blocks.
  constructor(gridX: number, gridZ: number, height: number, tileSize: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.startPx = Math.round(height * PIXELS_PER_BLOCK)
    this.topPx = this.startPx
    this.half = tileSize / 2
    this.extents.set(tileSize, 1, tileSize)
    this.position.set(gridX * tileSize + tileSize / 2, height - 1, gridZ * tileSize + tileSize / 2)
  }

  get top(): number {
    return this.topPx / PIXELS_PER_BLOCK
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    return topOverSquare(this.position, this.half, this.top, x, z, actorY)
  }

  override reset(): void {
    this.topPx = this.startPx
    this.position.y = this.top - 1
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as RiderCtx
    const rider = ctx.playerPosition
    if (!rider || !this.isStandingOn(rider) || this.restsOnGround(ctx)) return
    this.topPx -= SINK_PER_FRAME_PX
    this.position.y = this.top - 1
    rider.y = this.top
  }

  private isStandingOn(rider: THREE.Vector3): boolean {
    return isStoodOn(this, this.top, rider)
  }

  private restsOnGround(ctx: GroundCtx): boolean {
    const bottom = this.top - 1
    return bottom <= groundUnder(ctx, this.position.x, this.position.z, this.half, bottom) + 1e-6
  }
}
