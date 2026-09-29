import type * as THREE from 'three'
import type { Grid } from '../engine/Grid'
import { EPS } from '../engine/epsilons'

interface Body {
  position: THREE.Vector3
  extents: THREE.Vector3
}

// Where he goes when a guard or a shut grille walks into him: out of it the
// shorter way, if they meet at his height at all, and only to somewhere in the
// room clear of any block above his feet. Null to leave him where he is.
export function shovedClearOf(him: Body, other: Body, room: { grid: Grid; tileSize: number }): { x: number; z: number } | null {
  const dx = him.position.x - other.position.x
  const dz = him.position.z - other.position.z
  const overlapX = (him.extents.x + other.extents.x) / 2 - Math.abs(dx)
  const overlapZ = (him.extents.z + other.extents.z) / 2 - Math.abs(dz)
  if (overlapX <= 0 || overlapZ <= 0 || !overlapInHeight(him, other)) return null
  const to = overlapX < overlapZ
    ? { x: him.position.x + (dx >= 0 ? overlapX : -overlapX), z: him.position.z }
    : { x: him.position.x, z: him.position.z + (dz >= 0 ? overlapZ : -overlapZ) }
  return roomForHim(him, to, room) ? to : null
}

function overlapInHeight(him: Body, other: Body): boolean {
  return him.position.y < other.position.y + other.extents.y && him.position.y + him.extents.y > other.position.y
}

function roomForHim(him: Body, at: { x: number; z: number }, { grid, tileSize }: { grid: Grid; tileSize: number }): boolean {
  const half = him.extents.x / 2
  if (at.x - half < 0 || at.z - half < 0 || at.x + half > grid.width * tileSize || at.z + half > grid.depth * tileSize) return false
  return [-half, half].every((ox) => [-half, half].every((oz) =>
    grid.supportHeight(Math.floor((at.x + ox) / tileSize), Math.floor((at.z + oz) / tileSize)) <= him.position.y + EPS.STEP))
}
