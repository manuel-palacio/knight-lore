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

// Pursues the player in a straight line, ignoring the collision grid —
// it's a ghost. (Also deletes the need for any pathfinding.)
export class GhostEnemy extends Entity {
  constructor(x: number, z: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.9, 1.4, 0.9)
    this.position.set(x, FLOAT_HEIGHT, z)
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as GhostCtx
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
