import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Grid } from '../engine/Grid'

const DEFAULT_PATROL_SPEED = 1.6
// How close to the next solid cell we get before treating it as a wall hit
// and reversing direction. Slightly less than half the player's own slop so
// the visual still touches the surface.
const WALL_BUFFER = 0.45

interface PatrolCtx extends UpdateContext {
  grid?: Grid
  tileSize?: number
}

export class PatrolEnemy extends Entity {
  private a: { x: number; z: number }
  private b: { x: number; z: number }
  private dir: 1 | -1 = 1
  private readonly speed: number

  constructor(a: { x: number; z: number }, b: { x: number; z: number }, speed = DEFAULT_PATROL_SPEED) {
    super()
    this.categories = [Category.ACTOR_BODY, Category.HAZARD]
    this.extents.set(0.8, 1.6, 0.8)
    this.a = a
    this.b = b
    this.position.set(a.x, 0, a.z)
    this.speed = speed
  }

  private blocked(grid: Grid, tileSize: number, x: number, z: number): boolean {
    const cx = Math.floor(x / tileSize)
    const cz = Math.floor(z / tileSize)
    return grid.isSolid(cx, cz) && grid.supportHeight(cx, cz) > this.position.y
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as PatrolCtx
    const target = this.dir === 1 ? this.b : this.a
    const dx = target.x - this.position.x
    const dz = target.z - this.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.05) {
      this.dir = (this.dir === 1 ? -1 : 1) as 1 | -1
      return
    }
    const stepX = (dx / dist) * this.speed * dt
    const stepZ = (dz / dist) * this.speed * dt
    const nextX = this.position.x + stepX
    const nextZ = this.position.z + stepZ

    // If the next position would step into a solid grid cell at our height,
    // reverse the patrol and stop for this frame. This lets pushed blocks
    // (and walls) act as actual barriers instead of being walked through.
    if (ctx.grid && ctx.tileSize) {
      const sx = Math.sign(stepX)
      const sz = Math.sign(stepZ)
      const probeX = nextX + sx * WALL_BUFFER
      const probeZ = nextZ + sz * WALL_BUFFER
      if (
        this.blocked(ctx.grid, ctx.tileSize, probeX, this.position.z) ||
        this.blocked(ctx.grid, ctx.tileSize, this.position.x, probeZ)
      ) {
        this.dir = (this.dir === 1 ? -1 : 1) as 1 | -1
        return
      }
    }

    this.position.x = nextX
    this.position.z = nextZ
  }
}
