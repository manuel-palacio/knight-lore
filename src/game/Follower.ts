import type * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_UNIT, fitsAt, type GroundCtx } from './Gravity'
import { blockFillsAt } from './BlockSolids'
import { isStoodOn, topOverSquare } from './Holding'
import { MovingPlatform } from './MovingPlatform'

// Four pixels a frame along each axis; one while he rides a moving block
// (0xB936: bit 0 of his flags, set at 0xC7F5 while something carries him).
const RUNNING_STEP = 4 / PIXELS_PER_UNIT
const CRAWLING_STEP = 1 / PIXELS_PER_UNIT
// 10 pixels across and 12 high (the room table's t25: w 5, d 5, h 12).
const HALF_ACROSS = 5 / PIXELS_PER_UNIT
const HEIGHT = 1

interface FollowerCtx extends GroundCtx {
  playerPosition?: THREE.Vector3
  playerExtents?: THREE.Vector3
  entities?: Entity[]
}

// The sparkle cloud of the room table's t25 (graphics 0xA4-0xA7, handler
// 0xB92C) makes for him wherever he goes, a pixel step at a time along each
// axis, stopped by walls, blocks and him. It does not hurt: nothing marks it
// deadly, as the cauldron's is. It is solid, in his way, and stood on like
// any box.
export class Follower extends Entity {
  private readonly home: { x: number; y: number; z: number }
  private readonly clock = new FrameClock()

  constructor(x: number, y: number, z: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.extents.set(2 * HALF_ACROSS, HEIGHT, 2 * HALF_ACROSS)
    this.home = { x, y, z }
    this.position.set(x, y, z)
  }

  get top(): number {
    return this.position.y + HEIGHT
  }

  override reset(): void {
    this.position.set(this.home.x, this.home.y, this.home.z)
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    return topOverSquare(this.position, HALF_ACROSS, this.top, x, z, actorY)
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as FollowerCtx
    const him = ctx.playerPosition
    if (!him) return
    const step = this.hisRide(ctx) ? CRAWLING_STEP : RUNNING_STEP
    this.tryMove(ctx, towards(this.position.x, him.x, step), 0)
    this.tryMove(ctx, 0, towards(this.position.z, him.z, step))
  }

  private hisRide(ctx: FollowerCtx): boolean {
    const him = ctx.playerPosition!
    return (ctx.entities ?? []).some((e) => e instanceof MovingPlatform && isStoodOn(e, e.height, him))
  }

  private tryMove(ctx: FollowerCtx, dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return
    const x = this.position.x + dx
    const z = this.position.z + dz
    if (!fitsAt(ctx, x, z, HALF_ACROSS, this.position.y)) return
    if (this.meetsHim(ctx, x, z)) return
    const others = (ctx.entities ?? []).filter((e) => e !== this)
    const corners = [-HALF_ACROSS, HALF_ACROSS].flatMap((ox) => [-HALF_ACROSS, HALF_ACROSS].map((oz) => ({ x: x + ox, z: z + oz })))
    if (corners.some((c) => blockFillsAt(others, c.x, c.z, this.position.y, this.top))) return
    this.position.x = x
    this.position.z = z
  }

  private meetsHim(ctx: FollowerCtx, x: number, z: number): boolean {
    const him = ctx.playerPosition!
    const size = ctx.playerExtents
    if (!size) return false
    const across = Math.abs(him.x - x) < HALF_ACROSS + size.x / 2 && Math.abs(him.z - z) < HALF_ACROSS + size.z / 2
    return across && him.y < this.top && him.y + size.y > this.position.y
  }
}

function towards(from: number, to: number, step: number): number {
  return Math.sign(to - from) * Math.min(step, Math.abs(to - from))
}
