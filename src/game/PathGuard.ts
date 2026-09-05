import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { StepClock, STEP_LENGTH } from '../engine/StepClock'
import { facingFromDelta, type Facing } from './Facing'

// A guard marching a fixed loop of waypoints, one step per step tick, like
// the original's patrols. Touching it costs a life.
export class PathGuard extends Entity {
  facing: Facing = 'east'
  stepsTaken = 0
  private readonly path: { x: number; z: number }[]
  private targetIndex = 1
  private readonly clock = new StepClock()

  constructor(path: { x: number; z: number }[]) {
    super()
    if (path.length < 2) throw new Error('PathGuard needs at least two waypoints')
    this.categories = [Category.ACTOR_BODY, Category.HAZARD]
    this.extents.set(0.8, 1.6, 0.8)
    this.path = path
    this.position.set(path[0]!.x, 0, path[0]!.z)
    this.facing = this.facingToTarget()
  }

  override reset(): void {
    this.position.set(this.path[0]!.x, 0, this.path[0]!.z)
    this.targetIndex = 1
    this.stepsTaken = 0
    this.facing = this.facingToTarget()
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (!this.clock.tick()) return
    const target = this.path[this.targetIndex]!
    const dx = target.x - this.position.x
    const dz = target.z - this.position.z
    const dist = Math.hypot(dx, dz)
    this.facing = this.facingToTarget()
    if (dist <= STEP_LENGTH + 1e-9) {
      this.position.set(target.x, 0, target.z)
      this.targetIndex = (this.targetIndex + 1) % this.path.length
    } else {
      this.position.x += (dx / dist) * STEP_LENGTH
      this.position.z += (dz / dist) * STEP_LENGTH
    }
    this.stepsTaken++
  }

  private facingToTarget(): Facing {
    const target = this.path[this.targetIndex]!
    return facingFromDelta(target.x - this.position.x, target.z - this.position.z)
  }
}
