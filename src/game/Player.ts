import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { resolveHorizontal, type AABB } from '../engine/Collision'
import type { Grid } from '../engine/Grid'
import type { GameState } from './GameState'
import * as THREE from 'three'

// Filmation-style tank controls. The simulation runs at 60Hz but Sabreman
// only acts on a coarser step clock: every TICKS_PER_STEP ticks he turns one
// facing, walks one fixed STEP_LENGTH, or advances one frame of a committed
// jump arc. Nothing moves between steps, so positions stay on a fixed lattice.
export const TICKS_PER_STEP = 5
export const STEP_LENGTH = 0.25
const JUMP_HEIGHT = 1.0
const JUMP_STEPS = 6
const FALL_PER_STEP = 0.5

export type Facing = 'north' | 'east' | 'south' | 'west'

// Clockwise as seen on screen in the isometric projection.
const FACINGS_CLOCKWISE: Facing[] = ['north', 'east', 'south', 'west']

const FACING_VECTOR: Record<Facing, { x: number; z: number }> = {
  north: { x: 0, z: -1 },
  east: { x: 1, z: 0 },
  south: { x: 0, z: 1 },
  west: { x: -1, z: 0 },
}

export interface PlayerCtx extends UpdateContext {
  grid: Grid
  state: GameState
  tileSize: number
  input: { isDown: (code: string) => boolean; wasPressed: (code: string) => boolean }
  onLanded: () => void
  onJumped: () => void
}

export class Player extends Entity {
  state: 'grounded' | 'airborne' | 'jumping' = 'grounded'
  facing: Facing = 'south'
  stepsTaken = 0
  carrying: string | null = null

  private tickCounter = 0
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
    this.tickCounter++
    if (this.tickCounter % TICKS_PER_STEP !== 0) return
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

  private aabb(x: number, z: number): AABB {
    const hw = this.extents.x / 2
    const hd = this.extents.z / 2
    return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }
  }

  private supportAt(ctx: PlayerCtx): number {
    const cx = Math.floor(this.position.x / ctx.tileSize)
    const cz = Math.floor(this.position.z / ctx.tileSize)
    return ctx.grid.supportHeight(cx, cz)
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
