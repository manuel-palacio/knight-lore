import type { Entity } from './Entity'
import type { Form } from './GameState'
import { GhostEnemy } from './GhostEnemy'
import { CauldronSpirit } from './CauldronSpirit'
import { Spike } from './SpikeGrid'

// Some of the castle's monsters only go for the wolf; everything else hurts both.
export function hazardHunts(hazard: Entity, form: Form): boolean {
  if (hazard instanceof CauldronSpirit) return hazard.risen && form === 'werewolf'
  if (hazard instanceof GhostEnemy) return form === 'werewolf'
  return true
}

interface Body {
  position: { x: number; y: number; z: number }
  extents: { x: number; y: number; z: number }
}

// Spikes hurt the feet, so only standing (or landing) on the bed counts: a
// body brushing its edge, or jumping over it clear of the teeth, is safe.
// Every other hazard hurts on any overlap of the two bodies.
export function touchesHazard(player: Body, hazard: Body): boolean {
  if (player.position.y - hazard.position.y >= hazard.extents.y) return false
  const reachX = hazard instanceof Spike ? hazard.extents.x / 2 : (player.extents.x + hazard.extents.x) / 2
  const reachZ = hazard instanceof Spike ? hazard.extents.z / 2 : (player.extents.z + hazard.extents.z) / 2
  return Math.abs(player.position.x - hazard.position.x) < reachX && Math.abs(player.position.z - hazard.position.z) < reachZ
}
