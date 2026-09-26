import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { resolveHorizontal, type AABB } from '../engine/Collision'
import type { Grid } from '../engine/Grid'
import type { GameState } from './GameState'
import { FrameClock, StepClock, STEP_LENGTH, TICKS_PER_FRAME, TICKS_PER_STEP } from '../engine/StepClock'
import { PIXELS_PER_BLOCK } from './Gravity'
import { EPS } from '../engine/epsilons'
import { FACINGS_CLOCKWISE, FACING_VECTOR, type Facing } from './Facing'
import { Satchel } from './Satchel'
import { CHARM_HEIGHT, type Pickup } from './Pickup'

export { STEP_LENGTH, TICKS_PER_STEP }
export type { Facing }

// Filmation-style tank controls. On the ground Sabreman acts on the shared
// step clock: each step he turns one facing or walks one STEP_LENGTH. In the
// air he moves as the original's handler moves him, frame by frame on its
// clock (FrameClock): a jump sets off at 8 pixels a frame upwards (0xC95F),
// losing one a frame while Space is held on the way up and two otherwise
// (0xC9C1), so a tapped jump rises a block (12 pixels) and a held one 28;
// and all the while he goes forward at his walking pace (0xC9AB), three
// pixels a frame. Man and wolf jump alike. Nothing moves between ticks.
export const JUMP_SPEED_PX = 8
const AIR_STRIDE = (STEP_LENGTH * TICKS_PER_FRAME) / TICKS_PER_STEP
// Steps of grace after a respawn so a guard camping the door cannot chain kills.
export const INVULNERABLE_STEPS = 24

export interface PlayerCtx extends UpdateContext {
  grid: Grid
  state: GameState
  tileSize: number
  input: { isDown: (code: string) => boolean; wasPressed: (code: string) => boolean }
  // Height of any moving support under a point, or null. Grid support is static.
  dynamicSupport?: (x: number, z: number, actorY: number) => number | null
  onLanded: () => void
  onJumped: () => void
}

export class Player extends Entity {
  state: 'grounded' | 'airborne' | 'jumping' = 'grounded'
  facing: Facing = 'south'
  stepsTaken = 0
  readonly satchel = new Satchel<Pickup>()

  private readonly clock = new StepClock()
  private readonly frameClock = new FrameClock()
  private invulnerableSteps = 0
  private tappedKeys = new Set<string>()
  // Pixels a frame upwards while in the air; negative on the way down.
  private riseSpeedPx = 0

  constructor() {
    super()
    this.categories = [Category.ACTOR_BODY]
    this.extents.set(0.8, 1.6, 0.8)
  }

  get isInvulnerable(): boolean {
    return this.invulnerableSteps > 0
  }

  respawnAt(x: number, z: number, facing: Facing): void {
    this.position.set(x, 0, z)
    this.facing = facing
    this.state = 'grounded'
    this.riseSpeedPx = 0
    this.invulnerableSteps = INVULNERABLE_STEPS
  }

  update(_dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as PlayerCtx
    this.latchJumpRequest(ctx)
    this.latchTaps(ctx)
    const frame = this.frameClock.tick()
    if (this.state !== 'grounded') {
      if (frame) this.frameInTheAir(ctx)
    }
    if (!this.clock.tick()) return
    if (this.invulnerableSteps > 0) this.invulnerableSteps--
    if (this.state === 'grounded') this.stepGrounded(ctx)
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
    this.state = 'jumping'
    this.riseSpeedPx = JUMP_SPEED_PX
    ctx.onJumped()
  }

  private stepGrounded(ctx: PlayerCtx): void {
    if (this.keyActive(ctx, 'ArrowRight')) this.rotate(1)
    if (this.keyActive(ctx, 'ArrowLeft')) this.rotate(-1)
    if (this.keyActive(ctx, 'ArrowUp')) {
      this.walkForward(ctx)
      this.stepsTaken++
    }
    if (this.position.y > this.supportAt(ctx) + 1e-3) {
      this.state = 'airborne'
      this.riseSpeedPx = 0
    }
  }

  // One frame of the original's clock off the ground: forward (always in a
  // jump; in a fall only while walking on), then up or down.
  private frameInTheAir(ctx: PlayerCtx): void {
    if (this.state === 'jumping' || ctx.input.isDown('ArrowUp')) this.walkForward(ctx, AIR_STRIDE)
    const holding = this.state === 'jumping' && this.riseSpeedPx >= 0 && ctx.input.isDown('Space')
    this.riseSpeedPx -= holding ? 1 : 2
    this.position.y += this.riseSpeedPx / PIXELS_PER_BLOCK
    this.tryLand(ctx)
  }

  private tryLand(ctx: PlayerCtx): void {
    const supportY = this.supportAt(ctx)
    if (this.riseSpeedPx > 0 || this.position.y > supportY) return
    this.position.y = supportY
    this.state = 'grounded'
    this.riseSpeedPx = 0
    ctx.onLanded()
  }

  private rotate(turns: number): void {
    const index = FACINGS_CLOCKWISE.indexOf(this.facing)
    this.facing = FACINGS_CLOCKWISE[(index + turns + 4) % 4]
  }

  private walkForward(ctx: PlayerCtx, stride = STEP_LENGTH): void {
    const dir = FACING_VECTOR[this.facing]
    const targetX = this.position.x + dir.x * stride
    const targetZ = this.position.z + dir.z * stride
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
    return ctx.dynamicSupport?.(x, z, this.position.y) ?? -Infinity
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

  get carrying(): string[] {
    return this.satchel.ids
  }

  // The man takes a charm (the wolf cannot); `onTaken` is handed the one he
  // let go of to make room, if his hands were full.
  tryPickup(charm: Pickup, state: GameState, onTaken: (letGo: Pickup | undefined) => void): void {
    if (state.form !== 'human') return
    state.addItem(charm.id)
    const letGo = this.satchel.take(charm)
    if (letGo) state.removeItem(letGo.id)
    onTaken(letGo)
  }

  // As the original (0xC0DD): the charm carried longest goes down under his
  // feet and he stands on it, a block higher, when there is room over his
  // head. Returns the charm, to be laid where his feet were.
  putDownUnderFoot(state: GameState, headroom: boolean): Pickup | undefined {
    if (!headroom || this.state !== 'grounded') return undefined
    const charm = this.satchel.putDownOldest()
    if (!charm) return undefined
    state.removeItem(charm.id)
    this.position.y += CHARM_HEIGHT
    return charm
  }
}
