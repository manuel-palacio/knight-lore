import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

const PATROL_SPEED = 1.6

export class PatrolEnemy extends Entity {
  private a: { x: number; z: number }
  private b: { x: number; z: number }
  private dir: 1 | -1 = 1

  constructor(a: { x: number; z: number }, b: { x: number; z: number }) {
    super()
    this.categories = [Category.ACTOR_BODY, Category.HAZARD]
    this.extents.set(0.8, 1.6, 0.8)
    this.a = a
    this.b = b
    this.position.set(a.x, 0, a.z)
    this.renderPosition.copy(this.position)
  }

  update(dt: number, _ctx: UpdateContext): void {
    const target = this.dir === 1 ? this.b : this.a
    const dx = target.x - this.position.x
    const dz = target.z - this.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.05) {
      this.dir = (this.dir === 1 ? -1 : 1) as 1 | -1
      return
    }
    this.position.x += (dx / dist) * PATROL_SPEED * dt
    this.position.z += (dz / dist) * PATROL_SPEED * dt
  }
}
