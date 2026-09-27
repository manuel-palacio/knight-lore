import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, PIXELS_PER_UNIT, fallOneStep, groundUnder, type GroundCtx } from './Gravity'

// The original's table (the room table's t7) and chest (t6): solid boxes a
// block high that can be pushed (template flag bit 2, which the collision
// code at 0xCBCD reads to hand the pusher's velocity on). A table moves only
// while it is pushed (handler 0xC4C3 zeroes its velocity once it has moved);
// a chest slides on until something stops it (0xC4B6). Either falls when
// pushed off what it stands on, and a box standing on another rides along
// with it (0xCC6F). Positions and sizes are the template's, in pixels: a
// table 12 across and 20 deep, a chest 18 across and 12 deep.
export type BoxKind = 'table' | 'chest'

const HALF_PX: Record<BoxKind, { x: number; z: number }> = { table: { x: 6, z: 10 }, chest: { x: 9, z: 6 } }
const HEIGHT = 1
const EDGE = 1e-6

export interface Heading {
  x: number
  z: number
}

interface BoxCtx extends GroundCtx {
  boxes?: PushableBox[]
}

export class PushableBox extends Entity {
  readonly kind: BoxKind
  readonly halfX: number
  readonly halfZ: number
  heightPx: number
  speedPx = 0
  velocity: Heading = { x: 0, z: 0 }
  private readonly start: { x: number; z: number; heightPx: number }
  private readonly clock = new FrameClock()
  private lastSeen: { x: number; z: number; heightPx: number }

  // `bottom` is the height it stands at, in blocks.
  constructor(kind: BoxKind, at: { x: number; z: number }, bottom: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.kind = kind
    this.halfX = HALF_PX[kind].x / PIXELS_PER_UNIT
    this.halfZ = HALF_PX[kind].z / PIXELS_PER_UNIT
    this.extents.set(this.halfX * 2, HEIGHT, this.halfZ * 2)
    this.heightPx = Math.round(bottom * PIXELS_PER_BLOCK)
    this.start = { ...at, heightPx: this.heightPx }
    this.position.set(at.x, bottom, at.z)
    this.lastSeen = { ...at, heightPx: this.heightPx }
  }

  get bottom(): number {
    return this.heightPx / PIXELS_PER_BLOCK
  }

  get top(): number {
    return this.bottom + HEIGHT
  }

  // Solid: its top holds up whatever is over it, and stops whatever walks into it below its top.
  supportAt(x: number, z: number, _actorY: number): number | null {
    return this.covers(x, z) ? this.top : null
  }

  covers(x: number, z: number, margin = 0): boolean {
    return Math.abs(x - this.position.x) < this.halfX + margin - EDGE && Math.abs(z - this.position.z) < this.halfZ + margin - EDGE
  }

  // True when it has moved since this was last asked: pushed, carried or falling.
  consumeMoved(): boolean {
    const now = { x: this.position.x, z: this.position.z, heightPx: this.heightPx }
    const moved = now.x !== this.lastSeen.x || now.z !== this.lastSeen.z || now.heightPx !== this.lastSeen.heightPx
    this.lastSeen = now
    return moved
  }

  // Walked into: it takes on the pusher's velocity (units a frame).
  push(velocity: Heading): void {
    this.velocity = { ...velocity }
  }

  override reset(): void {
    this.position.set(this.start.x, this.start.heightPx / PIXELS_PER_BLOCK, this.start.z)
    this.heightPx = this.start.heightPx
    this.speedPx = 0
    this.velocity = { x: 0, z: 0 }
    this.lastSeen = { ...this.start }
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as BoxCtx
    if (this.velocity.x !== 0 || this.velocity.z !== 0) {
      const riders = this.ridersOn(ctx)
      if (this.slide(ctx, this.velocity)) for (const rider of riders) rider.slide(ctx, this.velocity)
      else this.velocity = { x: 0, z: 0 }
      if (this.kind === 'table') this.velocity = { x: 0, z: 0 }
    }
    this.fall(ctx)
  }

  // Moves by `step` if nothing is in the way: the room's walls, a block, another box.
  slide(ctx: BoxCtx, step: Heading): boolean {
    const x = this.position.x + step.x
    const z = this.position.z + step.z
    if (!this.fitsAt(ctx, x, z)) return false
    this.position.x = x
    this.position.z = z
    return true
  }

  private fitsAt(ctx: BoxCtx, x: number, z: number): boolean {
    const { grid, tileSize } = ctx
    if (grid && tileSize) {
      const inside = x - this.halfX >= 0 && z - this.halfZ >= 0 && x + this.halfX <= grid.width * tileSize && z + this.halfZ <= grid.depth * tileSize
      if (!inside) return false
      for (let cx = Math.floor((x - this.halfX + EDGE) / tileSize); cx <= Math.floor((x + this.halfX - EDGE) / tileSize); cx++) {
        for (let cz = Math.floor((z - this.halfZ + EDGE) / tileSize); cz <= Math.floor((z + this.halfZ - EDGE) / tileSize); cz++) {
          if (grid.supportHeight(cx, cz) > this.bottom + EDGE) return false
        }
      }
    }
    return !(ctx.boxes ?? []).some((other) => other !== this && this.overlaps(other, x, z))
  }

  private overlaps(other: PushableBox, x: number, z: number): boolean {
    const across = Math.abs(x - other.position.x) < this.halfX + other.halfX - EDGE && Math.abs(z - other.position.z) < this.halfZ + other.halfZ - EDGE
    return across && other.bottom < this.top - EDGE && other.top > this.bottom + EDGE
  }

  private ridersOn(ctx: BoxCtx): PushableBox[] {
    return (ctx.boxes ?? []).filter((other) => other !== this && Math.abs(other.bottom - this.top) < EDGE && this.overlapsAcross(other))
  }

  private overlapsAcross(other: PushableBox): boolean {
    return Math.abs(other.position.x - this.position.x) < this.halfX + other.halfX - EDGE && Math.abs(other.position.z - this.position.z) < this.halfZ + other.halfZ - EDGE
  }

  // Under gravity, down onto the floor, a block or another box.
  private fall(ctx: BoxCtx): void {
    const floor = groundUnder(ctx, this.position.x, this.position.z, Math.max(this.halfX, this.halfZ), this.bottom)
    const boxes = (ctx.boxes ?? []).filter((o) => o !== this && o.top <= this.bottom + EDGE && this.overlapsAcross(o)).map((o) => o.top)
    const groundPx = Math.round(Math.max(floor, ...boxes) * PIXELS_PER_BLOCK)
    if (this.heightPx <= groundPx) return
    fallOneStep(this, groundPx)
    this.position.y = this.bottom
  }
}
