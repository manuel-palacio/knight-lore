import { describe, it, expect } from 'vitest'
import { SpikedBall, DropTurn, DROP_CHANCE } from '../../src/game/SpikedBall'
import { hazardHunts, touchesHazard } from '../../src/game/Hazards'
import { Grid } from '../../src/engine/Grid'
import type { UpdateContext } from '../../src/game/Entity'
import { runFrames } from './frames'

const body = (x: number, y: number, z: number) => ({ position: { x, y, z }, extents: { x: 0.8, y: 1.6, z: 0.8 } })
const always = () => 0
const never = () => 0.99

// Heights in pixels, one a frame.
function run(ball: SpikedBall, frames: number, ctx: UpdateContext = { grid: new Grid(8, 8), tileSize: 2 }): number[] {
  const heights: number[] = []
  for (let f = 0; f < frames; f++) {
    runFrames(ball, 1, ctx)
    heights.push(ball.heightPx)
  }
  return heights
}

// The original's spiked ball: handler at 0xB7A9.
describe('SpikedBall', () => {
  it('hangs at its height in the middle of its cell and hurts both forms', () => {
    const ball = new SpikedBall({ x: 3, z: 2 }, 1, 2)
    expect(ball.position.x).toBe(7)
    expect(ball.position.z).toBe(5)
    expect(ball.position.y).toBe(1)
    expect(hazardHunts(ball)).toBe(true)
  })

  it('hurts Sabreman walking into it at its height, not passing under a high one', () => {
    expect(touchesHazard(body(7, 0, 5), new SpikedBall({ x: 3, z: 2 }, 0, 2))).toBe(true)
    expect(touchesHazard(body(7, 0, 5), new SpikedBall({ x: 3, z: 2 }, 2, 2))).toBe(false)
  })

  it('lets go one frame in sixteen: when the random byte is under 16', () => {
    expect(DROP_CHANCE).toBe(16 / 256)
    expect(new Set(run(new SpikedBall({ x: 3, z: 2 }, 6, 2, { random: never }), 50))).toEqual(new Set([72]))
  })

  it('any ball of a room may let go (the random byte is stirred after every object, 0xAFE4), but one at a time', () => {
    const turn = new DropTurn()
    const a = new SpikedBall({ x: 3, z: 2 }, 6, 2, { random: always, turn })
    const b = new SpikedBall({ x: 5, z: 2 }, 6, 2, { random: always, turn })
    const ctx = { grid: new Grid(8, 8), tileSize: 2 }
    runFrames(a, 1, ctx)
    runFrames(b, 1, ctx)
    expect(a.isFalling).toBe(true)
    expect(b.isFalling).toBe(false)
    for (let f = 0; f < 30; f++) {
      runFrames(a, 1, ctx)
      runFrames(b, 1, ctx)
    }
    expect([a.heightPx, b.heightPx]).toEqual([0, 0])
  })

  it('lands on a ball that fell there before it', () => {
    const turn = new DropTurn()
    const low = new SpikedBall({ x: 3, z: 2 }, 2, 2, { random: always, turn })
    const high = new SpikedBall({ x: 3, z: 2 }, 3, 2, { random: always, turn })
    const ctx = { grid: new Grid(8, 8), tileSize: 2 }
    for (let f = 0; f < 60; f++) {
      runFrames(low, 1, ctx)
      runFrames(high, 1, ctx)
    }
    expect([low.heightPx, high.heightPx]).toEqual([0, 12])
  })

  it('falls under gravity, a pixel a frame faster each frame, and lies where it lands', () => {
    const heights = run(new SpikedBall({ x: 3, z: 2 }, 6, 2, { random: always }), 30)
    expect(heights.slice(0, 5)).toEqual([72, 71, 69, 66, 62])
    expect(heights.at(-1)).toBe(0)
  })

  it('lands on a block under it', () => {
    const grid = new Grid(8, 8)
    grid.setSupport(3, 2, 2)
    expect(run(new SpikedBall({ x: 3, z: 2 }, 6, 2, { random: always }), 30, { grid, tileSize: 2 }).at(-1)).toBe(24)
  })

  it('in an odd-numbered room it waits until something is picked up or put down, and then for good', () => {
    const ball = new SpikedBall({ x: 3, z: 2 }, 6, 2, { waits: true, random: always })
    const ctx = { grid: new Grid(8, 8), tileSize: 2, carrying: [] as string[] }
    expect(new Set(run(ball, 20, ctx))).toEqual(new Set([72]))
    run(ball, 1, { ...ctx, carrying: ['gem'] })
    expect(run(ball, 30, ctx).at(-1)).toBe(0)
  })

  it('hangs again when the room is entered again', () => {
    const ball = new SpikedBall({ x: 3, z: 2 }, 6, 2, { random: always })
    run(ball, 30)
    ball.reset()
    expect(ball.position.y).toBe(6)
  })
})
