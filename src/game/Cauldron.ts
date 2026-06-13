import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { GameState } from './GameState'

export const DANGER_GRACE = 3
const INTERACT_RANGE = 1.8
const INTERACT_HEIGHT = 2.5
const DANGER_RANGE = 2.6

interface CauldronCtx extends UpdateContext {
  state: GameState
  playerPosition?: THREE.Vector3
}

// The cure rules live in GameState.deliverCureItem; this entity contributes
// a location (delivery range) and the werewolf danger. Danger only fires
// when the werewolf player is CLOSE to the cauldron — earlier we drained
// lives anywhere in the room and new players died walking past.
export class Cauldron extends Entity {
  private dangerTimer = DANGER_GRACE

  constructor() {
    super()
    this.categories = [Category.INTERACTION_TRIGGER]
    this.extents.set(1.4, 1, 1.4)
  }

  isInRange(p: THREE.Vector3): boolean {
    const horizontal = Math.hypot(p.x - this.position.x, p.z - this.position.z)
    return horizontal < INTERACT_RANGE && Math.abs(p.y - this.position.y) < INTERACT_HEIGHT
  }

  resetDanger(): void {
    this.dangerTimer = DANGER_GRACE
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as CauldronCtx
    const playerNear = ctx.playerPosition
      ? Math.hypot(ctx.playerPosition.x - this.position.x, ctx.playerPosition.z - this.position.z) < DANGER_RANGE
      : true
    if (ctx.state.form !== 'werewolf' || !playerNear) {
      this.dangerTimer = DANGER_GRACE
      return
    }
    this.dangerTimer -= dt
    if (this.dangerTimer <= 0) {
      ctx.state.loseLife()
      this.dangerTimer = DANGER_GRACE
    }
  }
}
