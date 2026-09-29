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
const TURN_REPEAT_SECONDS = 0.25
const TURN_REPEAT_STEPS = Math.round((TURN_REPEAT_SECONDS * 60) / TICKS_PER_STEP)
const GRACE_SECONDS = 2
export const INVULNERABLE_STEPS = (GRACE_SECONDS * 60) / TICKS_PER_STEP

export interface PlayerCtx extends UpdateContext {
  grid: Grid
  state: GameState
  tileSize: number
  input: { isDown: (code: string) => boolean; wasPressed: (code: string) => boolean }
  // Height of any moving support under a point, or null. Grid support is static.
  dynamicSupport?: (x: number, z: number, actorY: number) => number | null
  // True where a block that is not part of the room's floor (floating,
  // falling, crumbling, moving) fills any of the height from `from` to `to` over a point.
  dynamicSolid?: (x: number, z: number, from: number, to: number) => boolean
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
  private readonly stepsSinceTurn = new Map<string, number>()
  // Pixels a frame upwards while in the air; negative on the way down.
  private riseSpeedPx = 0

  constructor() {
    super()
    this.categories = [Category.ACTOR_BODY]
    this.extents.set(0.8, 1.6, 0.8)
  }

  // The original's frames he has walked: its legs change once a frame, every three pixels.
  get framesWalked(): number {
    return Math.floor((this.stepsTaken * TICKS_PER_STEP) / TICKS_PER_FRAME)
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

  // A press turns him at once; held, the turn repeats every quarter second,
  // slow enough to stop on the facing wanted at the original's walking pace.
  private turnWith(ctx: PlayerCtx, code: string, turns: number): void {
    if (!this.keyActive(ctx, code)) {
      this.stepsSinceTurn.delete(code)
      return
    }
    const since = this.stepsSinceTurn.get(code)
    if (since === undefined || since >= TURN_REPEAT_STEPS) {
      this.rotate(turns)
      this.stepsSinceTurn.set(code, 1)
    } else {
      this.stepsSinceTurn.set(code, since + 1)
    }
  }

  private latchJumpRequest(ctx: PlayerCtx): void {
    if (this.state !== 'grounded' || !ctx.input.wasPressed('Space')) return
    this.state = 'jumping'
    this.riseSpeedPx = JUMP_SPEED_PX
    ctx.onJumped()
  }

  private stepGrounded(ctx: PlayerCtx): void {
    this.turnWith(ctx, 'ArrowRight', 1)
    this.turnWith(ctx, 'ArrowLeft', -1)
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
    const risen = this.position.y + this.riseSpeedPx / PIXELS_PER_BLOCK
    if (this.riseSpeedPx > 0 && this.bodyMeetsBlockAt(ctx, this.position.x, this.position.z, risen)) this.riseSpeedPx = 0
    else this.position.y = risen
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
    if (this.highestUnderFootprint(ctx, targetX, targetZ) > this.position.y + EPS.STEP) return
    if (this.bodyMeetsBlockAt(ctx, targetX, targetZ, this.position.y)) return
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

  // A box or block is walked into, or stood on, when any of his body would
  // be in it or over it, not just his middle: two boxes side by side stop
  // him though a gap between them lines up with it, and he lands on a box's
  // edge.
  private highestUnderFootprint(ctx: PlayerCtx, x: number, z: number): number {
    return Math.max(...this.footprintPoints(x, z).map((p) => this.dynamicSupportAt(ctx, p.x, p.z)))
  }

  // Any of him, feet (above a step) to head, inside a floating, falling, crumbling or moving block.
  private bodyMeetsBlockAt(ctx: PlayerCtx, x: number, z: number, feet: number): boolean {
    const solid = ctx.dynamicSolid
    if (!solid) return false
    return this.footprintPoints(x, z).some((p) => solid(p.x, p.z, feet + EPS.STEP, feet + this.extents.y))
  }

  // His corners, the middles of his sides and his middle.
  private footprintPoints(x: number, z: number): { x: number; z: number }[] {
    const box = this.aabb(x, z)
    const inset = EPS.OVERLAP
    const xs = [box.minX + inset, x, box.maxX - inset]
    const zs = [box.minZ + inset, z, box.maxZ - inset]
    return xs.flatMap((px) => zs.map((pz) => ({ x: px, z: pz })))
  }

  private dynamicSupportAt(ctx: PlayerCtx, x: number, z: number): number {
    return ctx.dynamicSupport?.(x, z, this.position.y) ?? -Infinity
  }

  private aabb(x: number, z: number): AABB {
    const hw = this.extents.x / 2
    const hd = this.extents.z / 2
    return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }
  }

  // Held up by the highest block, box or charm any of his footprint is over, as the original's bounding box is.
  private supportAt(ctx: PlayerCtx): number {
    return Math.max(this.highestBlockUnderFootprint(ctx), this.highestUnderFootprint(ctx, this.position.x, this.position.z))
  }

  private highestBlockUnderFootprint(ctx: PlayerCtx): number {
    return Math.max(...this.footprintPoints(this.position.x, this.position.z).map((p) =>
      ctx.grid.supportHeight(Math.floor(p.x / ctx.tileSize), Math.floor(p.z / ctx.tileSize))))
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
