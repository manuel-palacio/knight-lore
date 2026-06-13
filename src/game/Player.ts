import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { resolveHorizontal, type AABB } from '../engine/Collision'
import type { Grid } from '../engine/Grid'
import type { GameState } from './GameState'
import * as THREE from 'three'

const PLAYER_SPEED = 4
const JUMP_HEIGHT = 1.0
const JUMP_DURATION = 0.5
const FALL_SPEED = 6

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
  jumpProgress = 0
  jumpStartY = 0
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

  private supportAt(x: number, z: number, grid: Grid, tileSize: number): number {
    const cx = Math.floor(x / tileSize)
    const cz = Math.floor(z / tileSize)
    return grid.supportHeight(cx, cz)
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
      this.position.y,
    )
    this.position.x = r.x
    this.position.z = r.z

    if (this.state === 'grounded' && ctx.input.wasPressed('Space')) {
      this.state = 'jumping'
      this.jumpProgress = 0
      this.jumpStartY = this.position.y
      ctx.onJumped()
    }

    const supportY = this.supportAt(this.position.x, this.position.z, ctx.grid, ctx.tileSize)

    if (this.state === 'jumping') {
      this.jumpProgress += dt / JUMP_DURATION
      if (this.jumpProgress >= 1) {
        this.state = 'airborne'
        this.position.y = this.jumpStartY
      } else {
        this.position.y = this.jumpStartY + Math.sin(this.jumpProgress * Math.PI) * JUMP_HEIGHT
      }
    } else if (this.state === 'airborne') {
      this.position.y -= FALL_SPEED * dt
      if (this.position.y <= supportY) {
        this.position.y = supportY
        this.state = 'grounded'
        ctx.onLanded()
      }
    } else {
      if (this.position.y > supportY + 1e-3) {
        this.state = 'airborne'
      }
    }
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
