import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, fallOneStep, groundUnder, type GroundCtx } from './Gravity'
import type { GameState } from './GameState'

// The original's spiked ball (the room table's t18, and t19, the same ball
// hung four blocks higher; handler at 0xB7A9): a hazard in the middle of its
// cell. Each frame it may let go, one chance in sixteen (the random byte at
// 0x5BA5, stirred again after every object's handler, 0xAFE4), and fall
// under gravity onto what is under it: the floor, a block, a table or a ball
// that fell before it. There it stays. Only one ball of a room falls at a
// time (0x5BBF, the room's DropTurn). In the original's odd-numbered rooms
// they wait until something is picked up or put down there (`waits`).
// Touching one costs a life; a high one can be walked under, until it falls.
export const DROP_CHANCE = 16 / 256
const SIZE = 1.2
const HEIGHT = 1

// The balls of a room, and which of them is falling: while one falls, none
// other lets go.
export class DropTurn {
  falling: SpikedBall | null = null
  readonly balls: SpikedBall[] = []
}

interface BallCtx extends GroundCtx {
  state?: GameState
  dynamicSupport?: (x: number, z: number, y: number) => number | null
}

export interface SpikedBallOptions {
  waits?: boolean
  random?: () => number
  turn?: DropTurn
}

export class SpikedBall extends Entity {
  heightPx: number
  speedPx = 0
  private falling = false
  private heldBack: boolean
  private carriedWhenEntered: string | null = null
  private readonly startPx: number
  private readonly waits: boolean
  private readonly random: () => number
  private readonly turn: DropTurn
  private readonly clock = new FrameClock()

  constructor(cell: { x: number; z: number }, height: number, tileSize: number, options: SpikedBallOptions = {}) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(SIZE, SIZE, SIZE)
    this.startPx = Math.round(height * PIXELS_PER_BLOCK)
    this.heightPx = this.startPx
    this.waits = options.waits ?? false
    this.heldBack = this.waits
    this.random = options.random ?? Math.random
    this.turn = options.turn ?? new DropTurn()
    this.turn.balls.push(this)
    this.position.set(cell.x * tileSize + tileSize / 2, height, cell.z * tileSize + tileSize / 2)
  }

  get isFalling(): boolean {
    return this.falling
  }

  override reset(): void {
    this.heightPx = this.startPx
    this.speedPx = 0
    this.falling = false
    this.turn.falling = null
    this.heldBack = this.waits
    this.carriedWhenEntered = null
    this.position.y = this.heightPx / PIXELS_PER_BLOCK
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as BallCtx
    if (this.falling) this.fall(ctx)
    else if (this.turn.falling === null && this.mayLetGo(ctx) && this.random() < DROP_CHANCE) {
      this.falling = true
      this.turn.falling = this
    }
    this.position.y = this.heightPx / PIXELS_PER_BLOCK
  }

  private fall(ctx: BallCtx): void {
    if (!fallOneStep(this, this.groundPx(ctx))) return
    this.falling = false
    this.turn.falling = null
  }

  private mayLetGo(ctx: BallCtx): boolean {
    if (!this.heldBack) return true
    const carried = (ctx.state?.inventory ?? []).join()
    this.carriedWhenEntered ??= carried
    this.heldBack = carried === this.carriedWhenEntered
    return !this.heldBack
  }

  private groundPx(ctx: BallCtx): number {
    const at = this.heightPx / PIXELS_PER_BLOCK
    const { x, z } = this.position
    const floor = groundUnder(ctx, x, z, SIZE / 2, at)
    const held = ctx.dynamicSupport?.(x, z, at)
    const balls = this.turn.balls
      .filter((b) => b !== this && Math.abs(b.position.x - x) < SIZE && Math.abs(b.position.z - z) < SIZE && b.position.y + HEIGHT <= at + 1e-6)
      .map((b) => b.position.y + HEIGHT)
    const top = Math.max(floor, held !== null && held !== undefined && held <= at + 1e-6 ? held : 0, ...balls)
    return Math.round(top * PIXELS_PER_BLOCK)
  }
}
