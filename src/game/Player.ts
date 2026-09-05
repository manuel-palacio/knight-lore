import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { resolveHorizontal, type AABB } from '../engine/Collision'
import type { Grid } from '../engine/Grid'
import type { GameState } from './GameState'
import * as THREE from 'three'
import { StepClock, STEP_LENGTH, TICKS_PER_STEP } from '../engine/StepClock'
import { EPS } from '../engine/epsilons'
import { FACINGS_CLOCKWISE, FACING_VECTOR, type Facing } from './Facing'

export { STEP_LENGTH, TICKS_PER_STEP }
export type { Facing }

// Filmation-style tank controls. Sabreman acts on the shared step clock:
// each step he turns one facing, walks one STEP_LENGTH, or advances one frame
// of a committed jump arc. Nothing moves between steps.
const JUMP_HEIGHT = 1.0
const JUMP_STEPS = 6
const FALL_PER_STEP = 0.5

export interface PlayerCtx extends UpdateContext {
  grid: Grid
  state: GameState
  tileSize: number
  input: { isDown: (code: string) => boolean; wasPressed: (code: string) => boolean }
  // Height of any moving support under a point, or null. Grid support is static.
  dynamicSupport?: (x: number, z: number) => number | null
  onLanded: () => void
  onJumped: () => void
}

export class Player extends Entity {
  state: 'grounded' | 'airborne' | 'jumping' = 'grounded'
  facing: Facing = 'south'
  stepsTaken = 0
  carrying: string | null = null

  private readonly clock = new StepClock()
  private tappedKeys = new Set<string>()
  private jumpStep = 0
  private jumpStartY = 0
  private jumpMovesForward = false

  constructor() {
    super()
    this.categories = [Category.ACTOR_BODY]
    this.extents.set(0.8, 1.6, 0.8)
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as PlayerCtx
    this.latchJumpRequest(ctx)
    this.latchTaps(ctx)
    if (!this.clock.tick()) return
    this.step(ctx)
    this.tappedKeys.clear()
  }

  // A key tapped and released between two step ticks must still count once,
  // otherwise short presses are silently dropped by the coarse step clock.
  private latchTaps(ctx: PlayerCtx): void {
    for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp']) {
      if (ctx.input.wasPressed(code)) this.tappedKeys.add(code)
    }
  }

  private keyActive(ctx: PlayerCtx, code: string): boolean {
    return ctx.input.isDown(code) || this.tappedKeys.has(code)
  }

  private latchJumpRequest(ctx: PlayerCtx): void {
    if (this.state !== 'grounded' || !ctx.input.wasPressed('Space')) return
    this.jumpMovesForward = ctx.input.isDown('ArrowUp')
    this.state = 'jumping'
    this.jumpStep = 0
    this.jumpStartY = this.position.y
    ctx.onJumped()
  }

  private step(ctx: PlayerCtx): void {
    if (this.state === 'grounded') this.stepGrounded(ctx)
    else this.stepAirborne(ctx)
  }

  private stepGrounded(ctx: PlayerCtx): void {
    if (this.keyActive(ctx, 'ArrowRight')) this.rotate(1)
    if (this.keyActive(ctx, 'ArrowLeft')) this.rotate(-1)
    if (this.keyActive(ctx, 'ArrowUp')) {
      this.walkForward(ctx)
      this.stepsTaken++
    }
    if (this.position.y > this.supportAt(ctx) + 1e-3) this.state = 'airborne'
  }

  private stepAirborne(ctx: PlayerCtx): void {
    if (this.jumpMovesForward) this.walkForward(ctx)
    if (this.state === 'jumping') this.advanceJumpArc()
    else this.position.y -= FALL_PER_STEP
    this.tryLand(ctx)
  }

  private advanceJumpArc(): void {
    this.jumpStep++
    if (this.jumpStep >= JUMP_STEPS) {
      this.state = 'airborne'
      this.position.y = this.jumpStartY
      return
    }
    this.position.y = this.jumpStartY + Math.sin((this.jumpStep / JUMP_STEPS) * Math.PI) * JUMP_HEIGHT
  }

  private tryLand(ctx: PlayerCtx): void {
    const descending = this.state === 'airborne' || this.jumpStep > JUMP_STEPS / 2
    const supportY = this.supportAt(ctx)
    if (!descending || this.position.y > supportY) return
    this.position.y = supportY
    this.state = 'grounded'
    this.jumpMovesForward = false
    ctx.onLanded()
  }

  private rotate(turns: number): void {
    const index = FACINGS_CLOCKWISE.indexOf(this.facing)
    this.facing = FACINGS_CLOCKWISE[(index + turns + 4) % 4]
  }

  private walkForward(ctx: PlayerCtx): void {
    const dir = FACING_VECTOR[this.facing]
    const targetX = this.position.x + dir.x * STEP_LENGTH
    const targetZ = this.position.z + dir.z * STEP_LENGTH
    if (this.dynamicSupportAt(ctx, targetX, targetZ) > this.position.y + EPS.STEP) return
    const resolved = resolveHorizontal(
      { x: this.position.x, z: this.position.z },
      { x: targetX, z: targetZ },
      this.aabb(targetX, targetZ),
      ctx.grid,
      ctx.tileSize,
      this.position.y,
    )
    this.position.x = resolved.x
    this.position.z = resolved.z
  }

  private dynamicSupportAt(ctx: PlayerCtx, x: number, z: number): number {
    return ctx.dynamicSupport?.(x, z) ?? -Infinity
  }

  private aabb(x: number, z: number): AABB {
    const hw = this.extents.x / 2
    const hd = this.extents.z / 2
    return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }
  }

  private supportAt(ctx: PlayerCtx): number {
    const cx = Math.floor(this.position.x / ctx.tileSize)
    const cz = Math.floor(this.position.z / ctx.tileSize)
    return Math.max(ctx.grid.supportHeight(cx, cz), this.dynamicSupportAt(ctx, this.position.x, this.position.z))
  }

  tryPickup(item: { id: string; position: THREE.Vector3 }, state: GameState, onSuccess: () => void): void {
    if (state.form !== 'human') return
    if (this.carrying) return
    this.carrying = item.id
    state.addItem(item.id)
    onSuccess()
  }

  dropCarried(state: GameState, onDrop: (id: string, pos: THREE.Vector3) => void): void {
    if (!this.carrying) return
    const id = this.carrying
    this.carrying = null
    state.removeItem(id)
    onDrop(id, this.position.clone())
  }
}
