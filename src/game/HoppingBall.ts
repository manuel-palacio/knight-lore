import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, PIXELS_PER_UNIT, fallOneStep, fitsAt, groundUnder, type GroundCtx } from './Gravity'
import type { GameState } from './GameState'

// The original's hopping ball (the room table's t23, handler at 0xB5FF).
// Each time it lands it springs up at four pixels a frame (four to seven, at
// random, in the original's odd-numbered rooms: `randomHops`) and sets off
// two pixels a frame along x or along z, which of the two at random: towards
// the wolf, and away from the man. Touching it costs a life.
export const HOP_SPEED_PX = 4
export const HOP_ACROSS_PX = 2
const HALF_WIDTH = 0.4

interface HopperCtx extends GroundCtx {
  state?: GameState
  playerPosition?: THREE.Vector3
}

export interface HoppingBallOptions {
  randomHops?: boolean
  random?: () => number
}

export class HoppingBall extends Entity {
  heightPx: number
  speedPx = 0
  heading = { x: 0, z: 0 }
  private readonly start: { x: number; z: number }
  private readonly startPx: number
  private readonly randomHops: boolean
  private readonly random: () => number
  private readonly clock = new FrameClock()

  constructor(at: { x: number; z: number }, height: number, options: HoppingBallOptions = {}) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.8, 0.8, 0.8)
    this.start = at
    this.startPx = Math.round(height * PIXELS_PER_BLOCK)
    this.heightPx = this.startPx
    this.randomHops = options.randomHops ?? false
    this.random = options.random ?? Math.random
    this.position.set(at.x, height, at.z)
  }

  override reset(): void {
    this.position.set(this.start.x, this.startPx / PIXELS_PER_BLOCK, this.start.z)
    this.heightPx = this.startPx
    this.speedPx = 0
    this.heading = { x: 0, z: 0 }
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    if (!this.clock.tick()) return
    const ctx = ctxRaw as HopperCtx
    this.slide(ctx)
    const landed = fallOneStep(this, this.groundPx(ctx))
    this.position.y = this.heightPx / PIXELS_PER_BLOCK
    if (landed) this.hop(ctx)
  }

  private slide(ctx: HopperCtx): void {
    const x = this.position.x + this.heading.x
    const z = this.position.z + this.heading.z
    if (fitsAt(ctx, x, z, HALF_WIDTH, this.position.y)) this.position.set(x, this.position.y, z)
  }

  private hop(ctx: HopperCtx): void {
    this.speedPx = HOP_SPEED_PX + (this.randomHops ? Math.floor(this.random() * 4) : 0)
    const player = ctx.playerPosition
    if (!player) return
    const wolf = ctx.state?.form === 'werewolf'
    const step = HOP_ACROSS_PX / PIXELS_PER_UNIT
    const towards = (mine: number, theirs: number) => ((theirs >= mine) === wolf ? step : -step)
    this.heading = this.random() < 0.5
      ? { x: towards(this.position.x, player.x), z: 0 }
      : { x: 0, z: towards(this.position.z, player.z) }
  }

  private groundPx(ctx: GroundCtx): number {
    return Math.round(groundUnder(ctx, this.position.x, this.position.z, HALF_WIDTH, this.heightPx / PIXELS_PER_BLOCK) * PIXELS_PER_BLOCK)
  }
}
