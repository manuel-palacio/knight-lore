import { GhostEnemy } from './GhostEnemy'
import type { UpdateContext } from './Entity'
import type { GameState } from './GameState'

// The cauldron room is no place for the wolf: at nightfall a spirit rises
// out of the cauldron and hunts him like a ghost. By day it is sunk in the
// cauldron, unseen, and like every ghost it ignores the man.
export class CauldronSpirit extends GhostEnemy {
  private isRisen = false

  get risen(): boolean {
    return this.isRisen
  }

  override update(dt: number, ctx: UpdateContext): void {
    const night = (ctx as { state: GameState }).state.form === 'werewolf'
    if (!night) {
      if (this.isRisen) this.reset()
      this.isRisen = false
      return
    }
    this.isRisen = true
    super.update(dt, ctx)
  }
}
