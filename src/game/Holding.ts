import type * as THREE from 'three'

// Things that hold up whatever stands on them: blocks that are not the room's
// floor (floating, falling, crumbling, moving), boxes and charms.
export interface Holder {
  // The top it holds up an actor at, over a point, or null.
  supportAt(x: number, z: number, actorY: number): number | null
}

// An actor this far below a top still stands on it (he steps up onto it);
// further below, he is under it, not on it.
const TOP_TOLERANCE = 0.5
// Stood on, not just over: his feet this close to the top.
const RIDER_TOLERANCE = 0.05

// The top of a square footprint `half` either side of `centre`, for an actor
// over it no lower than a step below the top.
export function topOverSquare(centre: { x: number; z: number }, half: number, top: number, x: number, z: number, actorY: number): number | null {
  const inside = Math.abs(x - centre.x) <= half && Math.abs(z - centre.z) <= half
  return inside && actorY >= top - TOP_TOLERANCE ? top : null
}

// Whether he stands on it now (it may carry him, or give way under him):
// over his middle, or with `halfWidth` anywhere under his feet, as his own
// footing counts it (see Player).
export function isStoodOn(holder: Holder, top: number, rider: THREE.Vector3, halfWidth = 0): boolean {
  if (Math.abs(rider.y - top) >= RIDER_TOLERANCE) return false
  const reach = Math.max(0, halfWidth - EDGE)
  const offsets = reach ? [-reach, 0, reach] : [0]
  return offsets.some((dx) => offsets.some((dz) => holder.supportAt(rider.x + dx, rider.z + dz, rider.y) !== null))
}

// His feet's edge kept just inside, as his footing has it.
const EDGE = 1e-6

export function isHolder<T extends object>(thing: T): thing is T & Holder {
  return 'supportAt' in thing
}
