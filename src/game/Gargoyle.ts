import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { PIXELS_PER_UNIT } from './Gravity'

// Within a pixel counts as touching: he is stopped flush against it, or
// stands on it, and the original tests the place he is moving to (0xCB9A).
const TOUCH = 1 / PIXELS_PER_UNIT

// A gargoyle (room type 4, graphic 0x16) is a block that kills: its handler
// (0xB7A3) marks it deadly (0xB85C), so walking into one, or standing on one,
// costs a life, man or wolf. The block itself is a level of its column (see
// Room.addDecor); this is what hurts.
export class Gargoyle extends Entity {
  constructor(gridX: number, gridZ: number, level: number, tileSize: number) {
    super()
    this.categories = [Category.HAZARD]
    this.extents.set(tileSize, 1, tileSize)
    this.position.set((gridX + 0.5) * tileSize, level, (gridZ + 0.5) * tileSize)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}

interface Body {
  position: { x: number; y: number; z: number }
  extents: { x: number; y: number; z: number }
}

// Against its sides or on its top, within a pixel.
export function touchesGargoyle(player: Body, gargoyle: Gargoyle): boolean {
  const top = gargoyle.position.y + gargoyle.extents.y
  if (player.position.y > top + TOUCH || player.position.y + player.extents.y <= gargoyle.position.y) return false
  const reach = (axis: 'x' | 'z') => (player.extents[axis] + gargoyle.extents[axis]) / 2 + TOUCH
  return Math.abs(player.position.x - gargoyle.position.x) < reach('x') && Math.abs(player.position.z - gargoyle.position.z) < reach('z')
}
