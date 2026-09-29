import type * as THREE from 'three'
import type { Entity } from './Entity'
import type { Grid } from '../engine/Grid'
import { CHARM_HEIGHT } from './Pickup'
import { VanishingBlock } from './VanishingBlock'

const EDGE = 1e-6

interface Holder {
  supportAt(x: number, z: number, actorY: number): number | null
}

// Whether he can be lifted a charm's height from where his feet are: nothing
// may fill the space his body would rise into (a crumbled block is gone).
export function headroomToLiftOnto(entities: readonly Entity[], him: { extents: THREE.Vector3 }, feet: THREE.Vector3): boolean {
  const from = feet.y + CHARM_HEIGHT
  const to = from + him.extents.y
  return !entities.some((e) => {
    if (!e.active || (e instanceof VanishingBlock && !e.present)) return false
    const over = Math.abs(e.position.x - feet.x) < (e.extents.x + him.extents.x) / 2 &&
      Math.abs(e.position.z - feet.z) < (e.extents.z + him.extents.z) / 2
    if (!over) return false
    const top = 'supportAt' in e ? (e as unknown as Holder).supportAt(feet.x, feet.z, Infinity) : null
    const bottom = top !== null ? top - 1 : e.position.y
    const height = top !== null ? 1 : e.extents.y
    return bottom < to && bottom + height > from + EDGE
  })
}

// A point within the room's floor, at least `half` from its edges: a charm let
// go of under a door arch lands just inside, not beyond the wall.
export function insideRoom(at: { x: number; z: number }, grid: Grid, tileSize: number, half: number): { x: number; z: number } {
  const clamp = (v: number, size: number) => Math.min(Math.max(v, half), size - half)
  return { x: clamp(at.x, grid.width * tileSize), z: clamp(at.z, grid.depth * tileSize) }
}
