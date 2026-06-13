import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { GameState } from './GameState'

export const DANGER_GRACE = 1.5
const INTERACT_RANGE = 1.8
const INTERACT_HEIGHT = 2.5

interface CauldronCtx extends UpdateContext {
  state: GameState
}

// The cure rules live in GameState.deliverCureItem; this entity contributes
// a location (delivery range) and the werewolf danger. It only ticks while
// its room is active, so "player is in the cauldron room" is implicit.
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
    if (ctx.state.form !== 'werewolf') {
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
