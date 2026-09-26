import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { GameState } from './GameState'

// Longer than the 2.2 s transformation, so a man caught delivering at dusk
// comes out of the seizure with a moment to run.
export const RISE_SECONDS = 3
export const SPIRIT_SPEED = 1.76
const FLOAT_HEIGHT = 0.8

interface SpiritCtx extends UpdateContext {
  state: GameState
  playerPosition: THREE.Vector3
}

// The cauldron room is no place for the wolf: at nightfall a spirit rises
// out of the cauldron and drifts straight at him through anything, faster
// than he can walk. By day it is sunk in the cauldron, unseen, and it ignores
// the man.
export class CauldronSpirit extends Entity {
  private readonly home: { x: number; z: number }
  private nightElapsed = 0

  constructor(x: number, z: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(0.9, 1.4, 0.9)
    this.home = { x, z }
    this.position.set(x, FLOAT_HEIGHT, z)
  }

  get risen(): boolean {
    return this.nightElapsed >= RISE_SECONDS
  }

  override reset(): void {
    this.position.set(this.home.x, FLOAT_HEIGHT, this.home.z)
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as SpiritCtx
    if (ctx.state.form !== 'werewolf') {
      if (this.risen) this.reset()
      this.nightElapsed = 0
      return
    }
    const wasRisen = this.risen
    this.nightElapsed += dt
    if (wasRisen) this.chase(dt, ctx.playerPosition)
  }

  private chase(dt: number, player: THREE.Vector3): void {
    const dx = player.x - this.position.x
    const dz = player.z - this.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 1e-3) return
    const step = Math.min(SPIRIT_SPEED * dt, dist)
    this.position.x += (dx / dist) * step
    this.position.z += (dz / dist) * step
  }
}
