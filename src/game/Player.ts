import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { resolveHorizontal, type AABB } from '../engine/Collision'
import type { Grid } from '../engine/Grid'
import type { GameState } from './GameState'

const PLAYER_SPEED = 4

export interface PlayerCtx extends UpdateContext {
  grid: Grid
  state: GameState
  tileSize: number
  input: { isDown: (code: string) => boolean; wasPressed: (code: string) => boolean }
  onLanded: () => void
  onJumped: () => void
}

export class Player extends Entity {
  carrying: string | null = null

  constructor() {
    super()
    this.categories = [Category.ACTOR_BODY]
    this.extents.set(0.8, 1.6, 0.8)
  }

  private aabb(x: number, z: number): AABB {
    const hw = this.extents.x / 2
    const hd = this.extents.z / 2
    return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as PlayerCtx

    let dx = 0
    let dz = 0
    if (ctx.input.isDown('ArrowUp')) dz -= 1
    if (ctx.input.isDown('ArrowDown')) dz += 1
    if (ctx.input.isDown('ArrowLeft')) dx -= 1
    if (ctx.input.isDown('ArrowRight')) dx += 1
    const len = Math.hypot(dx, dz)
    if (len > 0) {
      dx = (dx / len) * PLAYER_SPEED * dt
      dz = (dz / len) * PLAYER_SPEED * dt
    }

    const r = resolveHorizontal(
      { x: this.position.x, z: this.position.z },
      { x: this.position.x + dx, z: this.position.z + dz },
      this.aabb(this.position.x + dx, this.position.z + dz),
      ctx.grid,
      ctx.tileSize,
    )
    this.position.x = r.x
    this.position.z = r.z
  }
}
