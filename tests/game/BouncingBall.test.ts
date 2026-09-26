import { describe, it, expect } from 'vitest'
import { BouncingBall, BOUNCE_ABOVE_FIRST_PX, RISE_PER_FRAME_PX } from '../../src/game/BouncingBall'
import { ballTop } from '../../src/scenes/rooms/specBuilder'
import { Grid } from '../../src/engine/Grid'
import { Category } from '../../src/engine/categories'
import { runFrames } from './frames'

const TILE = 2
const room = (grid = new Grid(8, 8)) => ({ grid, tileSize: TILE })

// Heights in pixels, one a frame.
function run(b: BouncingBall, frames: number, ctx = room()): number[] {
  const heights: number[] = []
  for (let f = 0; f < frames; f++) {
    runFrames(b, 1, ctx)
    heights.push(b.heightPx)
  }
  return heights
}

// The original's ball: handler at 0xB865.
describe('BouncingBall', () => {
  it('is a hazard that bounces where it stands, never moving across the floor', () => {
    const b = new BouncingBall({ x: 7, z: 8 }, 0, 32 / 12)
    expect(b.hasCategory(Category.HAZARD)).toBe(true)
    run(b, 100)
    expect(b.position.x).toBe(7)
    expect(b.position.z).toBe(8)
  })

  it('rises two pixels a frame, stops just past its top, then falls a pixel a frame faster each frame', () => {
    const b = new BouncingBall({ x: 7, z: 7 }, 0, BOUNCE_ABOVE_FIRST_PX / 12)
    const heights = run(b, 40)
    const peak = heights.indexOf(Math.max(...heights))
    const rises = heights.slice(1, 17).map((h, i) => h - heights[i]!)
    expect(rises.every((d) => d === RISE_PER_FRAME_PX)).toBe(true)
    expect(heights[peak]).toBeGreaterThan(32)
    expect(heights[peak]).toBeLessThanOrEqual(32 + 3)
    const falls = heights.slice(peak + 1, peak + 5).map((h, i) => heights[peak + i]! - h)
    expect(falls).toEqual([0, 1, 2, 3])
    expect(heights).toContain(0)
  })

  it('bounces again once it lands, for good', () => {
    const b = new BouncingBall({ x: 7, z: 7 }, 0, 32 / 12)
    const heights = run(b, 120)
    const landings = heights.filter((h, i) => h === 0 && (heights[i - 1] ?? 0) > 0).length
    expect(landings).toBeGreaterThanOrEqual(3)
  })

  it('lands on the block under it, not the floor', () => {
    const grid = new Grid(8, 8)
    grid.setSupport(3, 3, 1)
    const b = new BouncingBall({ x: 7, z: 7 }, 1, 1 + 32 / 12)
    const heights = run(b, 60, room(grid))
    expect(Math.min(...heights)).toBe(12)
  })

  it('every ball in a room bounces up to 32 pixels over where the first one started (0xB86E)', () => {
    const top = ballTop({ id: 't', tint: 'blue', exits: [], spawn: { x: 0, z: 0 }, balls: [{ x: 3, z: 3, height: 1 }, { x: 5, z: 5, height: 0 }] })
    expect(top).toBeCloseTo(1 + 32 / 12, 5)
  })
})
