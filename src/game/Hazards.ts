import type { Entity } from './Entity'
import type { Form } from './GameState'
import { GhostEnemy } from './GhostEnemy'
import { CauldronSpirit } from './CauldronSpirit'

// Some of the castle's monsters only go for the wolf; everything else hurts both.
export function hazardHunts(hazard: Entity, form: Form): boolean {
  if (hazard instanceof CauldronSpirit) return hazard.risen && form === 'werewolf'
  if (hazard instanceof GhostEnemy) return form === 'werewolf'
  return true
}
