import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { PIXELS_PER_BLOCK } from './Gravity'
import type { Form } from './GameState'

const INTERACT_RANGE = 1.8
const INTERACT_HEIGHT = 2.5

// Over the cauldron hangs the charm it wants next, risen 32 pixels (to z
// 0xA0); the thing there takes the charm's picture only while he is a man, not
// while the wolf's legs are showing (0xB8DA-0xB913).
export const CHARM_OVER_CAULDRON = 32 / PIXELS_PER_BLOCK

export function charmOverCauldron(wanted: string | null, form: Form): string | null {
  return form === 'human' ? wanted : null
}

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
