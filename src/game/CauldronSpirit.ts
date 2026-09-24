import { GhostEnemy } from './GhostEnemy'
import type { UpdateContext } from './Entity'
import type { GameState } from './GameState'

// The cauldron room is no place for the wolf: at nightfall a spirit rises
// out of the cauldron and hunts him like a ghost. By day there is nothing
// there, and at dawn the spirit sinks back in.
export class CauldronSpirit extends GhostEnemy {
  constructor(x: number, z: number) {
    super(x, z)
    this.active = false
  }

  override update(dt: number, ctx: UpdateContext): void {
    const night = (ctx as { state: GameState }).state.form === 'werewolf'
    if (!night) {
      if (this.active) this.reset()
      this.active = false
      return
    }
    this.active = true
    super.update(dt, ctx)
  }
}
