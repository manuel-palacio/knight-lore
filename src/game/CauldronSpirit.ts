import { GhostEnemy } from './GhostEnemy'
import type { UpdateContext } from './Entity'
import type { GameState } from './GameState'

// Longer than the 2.2 s transformation, so a man caught delivering at dusk
// comes out of the seizure with a moment to run.
export const RISE_SECONDS = 3

// The cauldron room is no place for the wolf: at nightfall a spirit rises
// out of the cauldron and hunts him like a ghost. By day it is sunk in the
// cauldron, unseen, and like every ghost it ignores the man.
export class CauldronSpirit extends GhostEnemy {
  private nightElapsed = 0

  get risen(): boolean {
    return this.nightElapsed >= RISE_SECONDS
  }

  override update(dt: number, ctx: UpdateContext): void {
    const night = (ctx as { state: GameState }).state.form === 'werewolf'
    if (!night) {
      if (this.risen) this.reset()
      this.nightElapsed = 0
      return
    }
    const wasRisen = this.risen
    this.nightElapsed += dt
    if (wasRisen) super.update(dt, ctx)
  }
}
