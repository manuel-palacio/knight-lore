import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { FrameClock } from '../engine/StepClock'
import { PIXELS_PER_BLOCK, fallOneStep, groundUnder, type GroundCtx } from './Gravity'

// Subtle floor-bob so a static prop is findable on the black floor. Applied
// at draw time only; the pickup-range check sees the authoritative position.
const BOB_SPEED = 2.5
const BOB_AMPLITUDE = 0.06

// A charm lying on the floor is something to stand on, as in the original:
// drop one and climb it to reach a block too high to jump to from the floor.
// Like a table, it holds from above and does not stop anyone walking into it.
export const CHARM_HEIGHT = 1
const FOOTPRINT_HALF = 1
const TOP_TOLERANCE = 0.5
// Charms hover this far above what they lie on (see addPickup and dropAt callers).
export const CHARM_HOVER = 0.4
// In reach: within a stride across, and from a little over his head down to
// past a held jump's rise (28 px, 0xC9C1), so the charm he jumps off can be
// taken back in mid-air and carried on, as in the original.
const REACH_ACROSS = 1.6
const REACH_ABOVE = 1.8
const REACH_BELOW = 2.5

interface Holder {
  supportAt(x: number, z: number, actorY: number): number | null
}

export class Pickup extends Entity {
  readonly id: string
  // The castle's charm spot it was dealt to (see itemAtSpot), or null.
  readonly spot: number | null
  collected = false
  private bobPhase = 0
  private fallSpeedPx = 0
  private readonly clock = new FrameClock()

  constructor(id: string, spot: number | null = null) {
    super()
    this.id = id
    this.spot = spot
    this.categories = [Category.PICKUP_TRIGGER]
    this.extents.set(0.6, 0.6, 0.6)
  }

  update(dt: number, ctx: UpdateContext): void {
    this.bobPhase += dt
    if (this.clock.tick()) this.fall(ctx as GroundCtx & { entities?: Entity[] })
  }

  // Let go of in the air (the wolf drops what the man carried, mid-jump), it
  // falls as the original's objects do, onto whatever is under it: the
  // floor, a block, a box or another charm.
  private fall(ctx: GroundCtx & { entities?: Entity[] }): void {
    const bottom = this.position.y - CHARM_HOVER
    const groundPx = Math.round(this.groundUnder(ctx, bottom) * PIXELS_PER_BLOCK)
    const body = { heightPx: Math.round(bottom * PIXELS_PER_BLOCK), speedPx: this.fallSpeedPx }
    if (body.heightPx <= groundPx) {
      this.fallSpeedPx = 0
      return
    }
    fallOneStep(body, groundPx)
    this.fallSpeedPx = body.heightPx <= groundPx ? 0 : body.speedPx
    this.position.y = body.heightPx / PIXELS_PER_BLOCK + CHARM_HOVER
  }

  private groundUnder(ctx: GroundCtx & { entities?: Entity[] }, bottom: number): number {
    const floor = groundUnder(ctx, this.position.x, this.position.z, this.extents.x / 2, bottom)
    const holders = (ctx.entities ?? [])
      .filter((e): e is Entity & Holder => e !== this && 'supportAt' in e)
      .flatMap((e) => this.footprint().map((p) => e.supportAt(p.x, p.z, bottom)))
      .filter((top): top is number => top !== null && top <= bottom + 1e-6)
    return Math.max(floor, ...holders)
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    if (this.collected) return null
    const inside = Math.abs(x - this.position.x) <= FOOTPRINT_HALF && Math.abs(z - this.position.z) <= FOOTPRINT_HALF
    const top = this.position.y - CHARM_HOVER + CHARM_HEIGHT
    return inside && actorY >= top - TOP_TOLERANCE ? top : null
  }

  // Inside a block or a box (one back where it began, round it): up onto its top.
  liftOutOfWhatHolds(ctx: GroundCtx & { entities?: Entity[] }): void {
    const bottom = this.position.y - CHARM_HOVER
    const overlaps = (top: number) => top > bottom + 1e-6 && top - 1 < bottom + CHARM_HEIGHT
    const grid = this.footprint().map((p) => (ctx.grid && ctx.tileSize ? ctx.grid.supportHeight(Math.floor(p.x / ctx.tileSize), Math.floor(p.z / ctx.tileSize)) : 0))
    const held = (ctx.entities ?? [])
      .filter((e): e is Entity & Holder => e !== this && !(e instanceof Pickup) && 'supportAt' in e)
      .flatMap((e) => this.footprint().map((p) => e.supportAt(p.x, p.z, Infinity)))
      .filter((top): top is number => top !== null)
    const tops = [...grid.filter((top) => top > bottom + 1e-6), ...held.filter(overlaps)]
    if (tops.length) this.position.y = Math.max(...tops) + CHARM_HOVER
  }

  // Its corners and middle: it rests on whatever is under any of it.
  private footprint(): { x: number; z: number }[] {
    const half = this.extents.x / 2
    return [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]].map(([dx, dz]) => ({ x: this.position.x + dx! * half, z: this.position.z + dz! * half }))
  }

  isWithinReachOf(feet: { x: number; y: number; z: number }): boolean {
    const across = Math.hypot(this.position.x - feet.x, this.position.z - feet.z)
    const rise = this.position.y - feet.y
    return across < REACH_ACROSS && rise < REACH_ABOVE && rise > -REACH_BELOW
  }

  collect(): void {
    this.collected = true
    this.active = false
  }

  dropAt(x: number, y: number, z: number): void {
    this.collected = false
    this.active = true
    this.position.set(x, y, z)
  }

  get bobOffset(): number {
    return Math.sin(this.bobPhase * BOB_SPEED) * BOB_AMPLITUDE
  }
}
