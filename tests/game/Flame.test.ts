import { describe, it, expect } from 'vitest'
import { Flame, FLAME_FRAMES, FLAME_STEP_PX } from '../../src/game/Flame'
import { PIXELS_PER_UNIT } from '../../src/game/Gravity'
import { Grid } from '../../src/engine/Grid'
import { runFrames } from './frames'

const STEP = FLAME_STEP_PX / PIXELS_PER_UNIT

function run(flame: Flame, frames: number, grid = new Grid(8, 8)): void {
  runFrames(flame, frames, { grid, tileSize: 2 })
}

// The original's flames: type 10 (handler at 0xB80F) along its y, our z;
// type 20 (0xB7ED) along x; two pixels a frame, back the other way when stopped.
describe('Flame', () => {
  it('moves two pixels a frame along its axis and no other', () => {
    const flame = new Flame(9, 0, 9, 'x')
    run(flame, 4)
    expect(Math.abs(flame.position.x - 9)).toBeCloseTo(4 * STEP)
    expect(flame.position.z).toBe(9)

    const other = new Flame(9, 0, 9, 'z')
    run(other, 4)
    expect(other.position.x).toBe(9)
    expect(Math.abs(other.position.z - 9)).toBeCloseTo(4 * STEP)
  })

  it('turns back at the wall and shuttles between the walls', () => {
    const flame = new Flame(9, 0, 9, 'x')
    const seen: number[] = []
    for (let i = 0; i < 200; i++) {
      run(flame, 1)
      seen.push(flame.position.x)
    }
    expect(Math.min(...seen)).toBeLessThan(2)
    expect(Math.max(...seen)).toBeGreaterThan(14)
    for (const x of seen) expect(x >= 0 && x <= 16).toBe(true)
  })

  it('turns back at a block rising above it', () => {
    const grid = new Grid(8, 8)
    grid.setSolid(6, 4, true)
    grid.setSupport(6, 4, 1)
    grid.setSolid(2, 4, true)
    grid.setSupport(2, 4, 1)
    const flame = new Flame(9, 0, 9, 'x')
    for (let i = 0; i < 200; i++) {
      run(flame, 1, grid)
      expect(flame.position.x).toBeGreaterThan(5)
      expect(flame.position.x).toBeLessThan(13)
    }
  })

  it('stays on the block it burns on rather than stepping off it', () => {
    const grid = new Grid(8, 8)
    for (const x of [3, 4, 5]) {
      grid.setSolid(x, 4, true)
      grid.setSupport(x, 4, 1)
    }
    const flame = new Flame(9, 1, 9, 'x')
    for (let i = 0; i < 200; i++) {
      run(flame, 1, grid)
      expect(flame.position.x).toBeGreaterThan(6)
      expect(flame.position.x).toBeLessThan(12)
    }
  })

  it('turns back where it meets another flame, neither passing through the other', () => {
    const grid = new Grid(8, 8)
    const left = new Flame(5, 0, 9, 'x')
    const right = new Flame(13, 0, 9, 'x')
    const flames = [left, right]
    for (let i = 0; i < 200; i++) {
      for (const f of flames) runFrames(f, 1, { grid, tileSize: 2, entities: flames })
      expect(right.position.x - left.position.x).toBeGreaterThanOrEqual(0.8 - 1e-9)
    }
  })

  it('flickers between its two graphics (0x56, 0x57) on every frame (0xB985)', () => {
    expect(FLAME_FRAMES).toBe(2)
    const flame = new Flame(9, 0, 9, 'x')
    const seen: number[] = []
    for (let i = 0; i < 4; i++) {
      run(flame, 1)
      seen.push(flame.frame)
    }
    expect(seen).toEqual([1, 0, 1, 0])
  })

  it('goes back to where it started when the room is reset', () => {
    const flame = new Flame(9, 0, 9, 'z')
    run(flame, 10)
    flame.reset()
    expect(flame.position.toArray()).toEqual([9, 0, 9])
  })
})
