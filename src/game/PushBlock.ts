import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Grid } from '../engine/Grid'

const BLOCK_HEIGHT = 1.0

export type PushDir = 'north' | 'south' | 'east' | 'west'

export class PushBlock extends Entity {
  gridX: number
  gridZ: number
  moving = false

  constructor(gridX: number, gridZ: number) {
    super()
    this.categories = [Category.SOLID_DYNAMIC, Category.SUPPORT_SURFACE]
    this.extents.set(1.6, 1.0, 1.6)
    this.gridX = gridX
    this.gridZ = gridZ
  }

  placeOnGrid(grid: Grid, tileSize: number): void {
    grid.setSolid(this.gridX, this.gridZ, true)
    grid.setSupport(this.gridX, this.gridZ, BLOCK_HEIGHT)
    grid.setOccupant(this.gridX, this.gridZ, this)
    this.position.set(
      this.gridX * tileSize + tileSize / 2,
      0,
      this.gridZ * tileSize + tileSize / 2,
    )
    this.renderPosition.copy(this.position)
  }

  tryPush(dir: PushDir, grid: Grid, tileSize: number): boolean {
    const [dx, dz] = dir === 'east' ? [1, 0]
      : dir === 'west' ? [-1, 0]
      : dir === 'south' ? [0, 1]
      : [0, -1]
    const tx = this.gridX + dx
    const tz = this.gridZ + dz

    if (grid.isSolid(tx, tz)) return false
    if (grid.occupant(tx, tz) !== null) return false

    grid.setSolid(this.gridX, this.gridZ, false)
    grid.setSupport(this.gridX, this.gridZ, 0)
    grid.setOccupant(this.gridX, this.gridZ, null)

    this.gridX = tx
    this.gridZ = tz
    grid.setSolid(tx, tz, true)
    grid.setSupport(tx, tz, BLOCK_HEIGHT)
    grid.setOccupant(tx, tz, this)
    this.position.set(tx * tileSize + tileSize / 2, 0, tz * tileSize + tileSize / 2)
    return true
  }

  update(_dt: number, _ctx: UpdateContext): void {
    // No per-tick logic in MVP; pushes are atomic via tryPush().
  }
}
