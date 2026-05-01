import { Grid } from './Grid'
import { EPS } from './epsilons'

export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface Vec2 {
  x: number
  z: number
}

export interface CollisionResult {
  x: number
  z: number
  blockedX: boolean
  blockedZ: boolean
}

function worldToCell(worldX: number, tileSize: number): number {
  return Math.floor(worldX / tileSize)
}

// Resolves horizontal movement against the grid's solid cells with axis tracking.
// Implements PHYSICS_AND_COLLISION.md § Axis Resolution.
export function resolveHorizontal(
  start: Vec2,
  end: Vec2,
  shape: AABB,
  grid: Grid,
  tileSize: number,
): CollisionResult {
  const halfW = (shape.maxX - shape.minX) / 2
  const halfD = (shape.maxZ - shape.minZ) / 2

  let resolvedX = end.x
  let blockedX = false

  if (end.x !== start.x) {
    const movingPositive = end.x > start.x
    const leadingEdge = movingPositive ? end.x + halfW : end.x - halfW
    const leadingCell = worldToCell(leadingEdge, tileSize)

    const sweptMinZ = Math.min(start.z, end.z)
    const sweptMaxZ = Math.max(start.z, end.z)
    const minCellZ = worldToCell(sweptMinZ - halfD + EPS.OVERLAP, tileSize)
    const maxCellZ = worldToCell(sweptMaxZ + halfD - EPS.OVERLAP, tileSize)

    for (let cz = minCellZ; cz <= maxCellZ; cz++) {
      const startCell = worldToCell(
        movingPositive ? start.x + halfW : start.x - halfW,
        tileSize,
      )
      const step = movingPositive ? 1 : -1
      for (
        let cx = startCell + step;
        movingPositive ? cx <= leadingCell : cx >= leadingCell;
        cx += step
      ) {
        if (grid.isSolid(cx, cz)) {
          resolvedX = movingPositive
            ? cx * tileSize - halfW - EPS.OVERLAP
            : (cx + 1) * tileSize + halfW + EPS.OVERLAP
          blockedX = true
          break
        }
      }
      if (blockedX) break
    }
  }

  let resolvedZ = end.z
  let blockedZ = false

  if (end.z !== start.z) {
    const movingPositive = end.z > start.z
    const leadingEdge = movingPositive ? end.z + halfD : end.z - halfD
    const leadingCell = worldToCell(leadingEdge, tileSize)

    const sweptMinX = Math.min(start.x, end.x)
    const sweptMaxX = Math.max(start.x, end.x)
    const minCellX = worldToCell(sweptMinX - halfW + EPS.OVERLAP, tileSize)
    const maxCellX = worldToCell(sweptMaxX + halfW - EPS.OVERLAP, tileSize)

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      const startCell = worldToCell(
        movingPositive ? start.z + halfD : start.z - halfD,
        tileSize,
      )
      const step = movingPositive ? 1 : -1
      for (
        let cz = startCell + step;
        movingPositive ? cz <= leadingCell : cz >= leadingCell;
        cz += step
      ) {
        if (grid.isSolid(cx, cz)) {
          resolvedZ = movingPositive
            ? cz * tileSize - halfD - EPS.OVERLAP
            : (cz + 1) * tileSize + halfD + EPS.OVERLAP
          blockedZ = true
          break
        }
      }
      if (blockedZ) break
    }
  }

  return { x: resolvedX, z: resolvedZ, blockedX, blockedZ }
}
