import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Grid } from '../engine/Grid'

export class StaticBlock extends Entity {
  readonly gridX: number
  readonly gridZ: number
  readonly height: number

  constructor(gridX: number, gridZ: number, height: number) {
    super()
    this.categories = [Category.SOLID_WORLD, Category.SUPPORT_SURFACE]
    this.gridX = gridX
    this.gridZ = gridZ
    this.height = height
    this.extents.set(2, height, 2)
  }

  placeOnGrid(grid: Grid, tileSize: number): void {
    grid.setSolid(this.gridX, this.gridZ, true)
    grid.setSupport(this.gridX, this.gridZ, this.height)
    grid.setOccupant(this.gridX, this.gridZ, this)
    this.position.set(
      this.gridX * tileSize + tileSize / 2,
      0,
      this.gridZ * tileSize + tileSize / 2,
    )
  }

  update(_dt: number, _ctx: UpdateContext): void {
    // static
  }
}
