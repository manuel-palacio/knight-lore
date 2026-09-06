import type { Entity } from './Entity'
import type { Form } from './GameState'
import { GhostEnemy } from './GhostEnemy'

// Some of the castle's monsters only go for the wolf; everything else hurts both.
export function hazardHunts(hazard: Entity, form: Form): boolean {
  if (hazard instanceof GhostEnemy) return form === 'werewolf'
  return true
}
