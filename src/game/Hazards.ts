import type { Entity } from './Entity'
import { CauldronSpirit } from './CauldronSpirit'
import { Spike } from './SpikeGrid'
import { Portcullis } from './Portcullis'

// Whether it hurts him now, man or wolf: the cauldron's spirit once it has
// turned, a gate as it comes down, everything else always.
export function hazardHunts(hazard: Entity): boolean {
  if (hazard instanceof CauldronSpirit) return hazard.risen
  if (hazard instanceof Portcullis) return hazard.crushing
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
  if (hazard.position.y - player.position.y >= player.extents.y) return false
  const reachX = hazard instanceof Spike ? hazard.extents.x / 2 : (player.extents.x + hazard.extents.x) / 2
  const reachZ = hazard instanceof Spike ? hazard.extents.z / 2 : (player.extents.z + hazard.extents.z) / 2
  return Math.abs(player.position.x - hazard.position.x) < reachX && Math.abs(player.position.z - hazard.position.z) < reachZ
}
