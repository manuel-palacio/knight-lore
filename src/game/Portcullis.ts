import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { StepClock } from '../engine/StepClock'

// The original's portcullis (handler at 0xC65E): it rests shut, and on the
// game's 32-frame beat rises one pixel a frame to 31 pixels, waits, then drops
// faster every frame. A block is 12 pixels high, and one of the original's
// frames is one of our steps.
export const PORTCULLIS_REST_STEPS = 32
export const PORTCULLIS_OPEN_STEPS = 32
export const PORTCULLIS_TOP = 31 / 12
const RISE_PER_STEP = 1 / 12
const FALL_SPEEDUP_PER_STEP = 1 / 12
// Sabreman walks under it once its bottom edge clears his head.
const HEADROOM = 1.7
const THICKNESS = 0.4
const GRILLE_HEIGHT = 3.5

export type PortcullisState = 'shut' | 'rising' | 'open' | 'falling'

interface Cell {
  x: number
  z: number
}

// A grille across a straight line of cells, from one cell to another.
export class Portcullis extends Entity {
  state: PortcullisState = 'shut'
  bottom = 0
  readonly cells: Cell[]
  private waited = 0
  private fallSpeed = 0
  private readonly clock = new StepClock()

  constructor(from: Cell, to: Cell, tileSize: number) {
    super()
    this.categories = [Category.ACTOR_BODY, Category.HAZARD]
    this.cells = cellsBetween(from, to)
    const alongX = from.z === to.z
    const span = (this.cells.length) * tileSize
    this.extents.set(alongX ? span : THICKNESS, GRILLE_HEIGHT, alongX ? THICKNESS : span)
    this.position.set(
      ((from.x + to.x) / 2) * tileSize + tileSize / 2,
      0,
      ((from.z + to.z) / 2) * tileSize + tileSize / 2,
    )
  }

  // Low enough that nobody gets through underneath.
  get blocking(): boolean {
    return this.state !== 'falling' && this.bottom < HEADROOM
  }

  get crushing(): boolean {
    return this.state === 'falling'
  }

  override reset(): void {
    this.state = 'shut'
    this.bottom = 0
    this.waited = 0
    this.fallSpeed = 0
    this.position.y = 0
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (!this.clock.tick()) return
    switch (this.state) {
      case 'shut': return this.waitThen(PORTCULLIS_REST_STEPS, 'rising')
      case 'rising': return this.rise()
      case 'open': return this.waitThen(PORTCULLIS_OPEN_STEPS, 'falling')
      case 'falling': return this.fall()
    }
  }

  private waitThen(steps: number, next: PortcullisState): void {
    this.waited++
    if (this.waited < steps) return
    this.waited = 0
    this.state = next
  }

  private rise(): void {
    this.moveTo(Math.min(PORTCULLIS_TOP, this.bottom + RISE_PER_STEP))
    if (this.bottom >= PORTCULLIS_TOP) this.state = 'open'
  }

  private fall(): void {
    this.fallSpeed += FALL_SPEEDUP_PER_STEP
    this.moveTo(Math.max(0, this.bottom - this.fallSpeed))
    if (this.bottom > 0) return
    this.fallSpeed = 0
    this.state = 'shut'
  }

  private moveTo(bottom: number): void {
    this.bottom = bottom
    this.position.y = bottom
  }
}

function cellsBetween(from: Cell, to: Cell): Cell[] {
  const cells = [{ ...from }]
  const at = { ...from }
  while (at.x !== to.x || at.z !== to.z) {
    at.x += Math.sign(to.x - at.x)
    at.z += Math.sign(to.z - at.z)
    cells.push({ ...at })
  }
  return cells
}
