import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { GameState } from './GameState'

export const GHOST_SPEED = 1.1
export const WEREWOLF_AGGRESSION = 1.6
const FLOAT_HEIGHT = 0.8

interface GhostCtx extends UpdateContext {
  state: GameState
  playerPosition: THREE.Vector3
}

// Hovers where it was placed while Sabreman is human; once he is the wolf it
// drifts straight at him through anything, faster than he can walk.
export class GhostEnemy extends Entity {
  private readonly home: { x: number; z: number }

  constructor(x: number, z: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.9, 1.4, 0.9)
    this.home = { x, z }
    this.position.set(x, FLOAT_HEIGHT, z)
  }

  override reset(): void {
    this.position.set(this.home.x, FLOAT_HEIGHT, this.home.z)
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as GhostCtx
    if (ctx.state.form !== 'werewolf') return
    const dx = ctx.playerPosition.x - this.position.x
    const dz = ctx.playerPosition.z - this.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 1e-3) return
    const speed = GHOST_SPEED * (ctx.state.form === 'werewolf' ? WEREWOLF_AGGRESSION : 1)
    const step = Math.min(speed * dt, dist)
    this.position.x += (dx / dist) * step
    this.position.z += (dz / dist) * step
    this.position.y = FLOAT_HEIGHT
  }
}
