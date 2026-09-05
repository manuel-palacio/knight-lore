import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

const INTERACT_RANGE = 1.8
const INTERACT_HEIGHT = 2.5

// The cure rules — sequence, wanted item, human-only delivery — all live in
// GameState.deliverCureItem. The Cauldron entity is just a location with an
// interaction range. (We previously had a werewolf-near-cauldron danger
// timer; removed because it wasn't in the original game and was killing
// players for nothing.)
export class Cauldron extends Entity {
  constructor() {
    super()
    this.categories = [Category.INTERACTION_TRIGGER]
    this.extents.set(1.4, 1, 1.4)
  }

  isInRange(p: { x: number; y: number; z: number }): boolean {
    const horizontal = Math.hypot(p.x - this.position.x, p.z - this.position.z)
    return horizontal < INTERACT_RANGE && Math.abs(p.y - this.position.y) < INTERACT_HEIGHT
  }

  update(_dt: number, _ctx: UpdateContext): void {
    // No-op: location-only entity. Interaction handled by main.ts deliver pass.
  }
}
