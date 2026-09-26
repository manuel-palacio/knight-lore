import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { FallingBlock, SINK_PER_FRAME_PX } from '../../src/game/FallingBlock'
import { Grid } from '../../src/engine/Grid'
import { Category } from '../../src/engine/categories'
import { runFrames } from './frames'

function run(b: FallingBlock, rider: THREE.Vector3, frames: number, grid = new Grid(8, 8)): void {
  runFrames(b, frames, { playerPosition: rider, grid, tileSize: 2 })
}

// The original's falling block: handler at 0xB683.
describe('FallingBlock', () => {
  it('holds from above only, like a table', () => {
    const b = new FallingBlock(2, 2, 3, 2)
    expect(b.hasCategory(Category.SUPPORT_SURFACE)).toBe(true)
    expect(b.supportAt(5, 5, 3)).toBe(3)
    expect(b.supportAt(5, 5, 0)).toBeNull()
  })

  it('sinks a pixel a frame while someone stands on it, carrying him down', () => {
    expect(SINK_PER_FRAME_PX).toBe(1)
    const b = new FallingBlock(2, 2, 3, 2)
    const rider = new THREE.Vector3(5, 3, 5)
    run(b, rider, 6)
    expect(b.topPx).toBe(36 - 6)
    expect(rider.y).toBeCloseTo(30 / 12, 5)
  })

  it('stops as soon as he steps off, and stays where it stopped', () => {
    const b = new FallingBlock(2, 2, 3, 2)
    const rider = new THREE.Vector3(5, 3, 5)
    run(b, rider, 4)
    rider.set(9, 0, 5)
    run(b, rider, 20)
    expect(b.topPx).toBe(32)
  })

  it('comes to rest on what is under it', () => {
    const grid = new Grid(8, 8)
    grid.setSupport(2, 2, 1)
    const b = new FallingBlock(2, 2, 3, 2)
    run(b, new THREE.Vector3(5, 3, 5), 60, grid)
    expect(b.top).toBe(2)
  })

  it('is back where it was when the room is entered again', () => {
    const b = new FallingBlock(2, 2, 3, 2)
    run(b, new THREE.Vector3(5, 3, 5), 10)
    b.reset()
    expect(b.top).toBe(3)
  })
})
