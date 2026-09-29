import type { Entity } from './Entity'
import { FloatingBlock } from './FloatingBlock'
import { FallingBlock } from './FallingBlock'
import { VanishingBlock } from './VanishingBlock'
import { MovingPlatform } from './MovingPlatform'

// The blocks that are not part of a room's floor (floating, falling,
// crumbling, moving) are solid to the whole of him, as the original's
// bounding boxes are, not only to his feet.
export function blockFillsAt(entities: readonly Entity[], x: number, z: number, from: number, to: number): boolean {
  return entities.some((e) => {
    const span = blockSpan(e)
    if (!span) return false
    const half = e.extents.x / 2
    const over = Math.abs(x - e.position.x) < half && Math.abs(z - e.position.z) < half
    return over && from < span.top && to > span.bottom
  })
}

function blockSpan(e: Entity): { bottom: number; top: number } | null {
  if (e instanceof FloatingBlock) return { bottom: e.bottom, top: e.top }
  if (e instanceof FallingBlock) return { bottom: e.top - 1, top: e.top }
  if (e instanceof VanishingBlock) return e.present ? { bottom: e.height - 1, top: e.height } : null
  if (e instanceof MovingPlatform) return { bottom: e.bottom, top: e.height }
  return null
}
