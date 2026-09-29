import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { PIXELS_PER_BLOCK, PIXELS_PER_UNIT } from './Gravity'
import { topOverSquare } from './Holding'
import type { Form } from './GameState'

// Over the cauldron hangs the charm it wants next, risen 32 pixels (to z
// 0xA0); the thing there takes the charm's picture only while he is a man, not
// while the wolf's legs are showing (0xB8DA-0xB913).
export const CHARM_OVER_CAULDRON = 32 / PIXELS_PER_BLOCK

export function charmOverCauldron(wanted: string | null, form: Form): string | null {
  return form === 'human' ? wanted : null
}

// The cauldron (background part 0x8D, table 0x6CE2): a box 20 pixels across
// and 24 high, two blocks, in the middle of the room. He stands on it like a
// block, and a charm put down up there goes into it (see SinkingCharm).
const HALF_ACROSS = 10 / PIXELS_PER_UNIT
export const CAULDRON_TOP = 24 / PIXELS_PER_BLOCK

export class Cauldron extends Entity {
  constructor(x: number, z: number) {
    super()
    this.categories = [Category.SUPPORT_SURFACE]
    this.extents.set(2 * HALF_ACROSS, CAULDRON_TOP, 2 * HALF_ACROSS)
    this.position.set(x, 0, z)
  }

  supportAt(x: number, z: number, actorY: number): number | null {
    return topOverSquare(this.position, HALF_ACROSS, CAULDRON_TOP, x, z, actorY)
  }

  update(_dt: number, _ctx: UpdateContext): void {}
}
