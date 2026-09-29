import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Follower } from '../../src/game/Follower'
import { MovingPlatform } from '../../src/game/MovingPlatform'
import { Grid } from '../../src/engine/Grid'
import { Category } from '../../src/engine/categories'
import { blockFillsAt } from '../../src/game/BlockSolids'
import { runFrames } from './frames'

const size = new THREE.Vector3(0.8, 2, 0.8)
function ctx(him: THREE.Vector3, extra: object = {}) {
  return { grid: new Grid(8, 8), tileSize: 2, playerPosition: him, playerExtents: size, entities: [], ...extra }
}

describe('Follower (room table t25, handler 0xB92C)', () => {
  it('makes for him four pixels a frame along each axis', () => {
    const f = new Follower(5, 0, 5)
    runFrames(f, 1, ctx(new THREE.Vector3(12, 0, 1)))
    expect(f.position.x).toBeCloseTo(5.5, 9)
    expect(f.position.z).toBeCloseTo(4.5, 9)
  })

  it('crawls a pixel a frame while he rides a moving block (0xB936)', () => {
    const f = new Follower(5, 0, 5)
    const block = new MovingPlatform({ x: 13, z: 13 }, { x: 13, z: 13 }, 1)
    const him = new THREE.Vector3(13, 1, 13)
    runFrames(f, 1, ctx(him, { entities: [block] }))
    expect(f.position.x).toBeCloseTo(5 + 1 / 8, 9)
  })

  it('stops against him, and does not hurt him', () => {
    const f = new Follower(5, 0, 5)
    runFrames(f, 20, ctx(new THREE.Vector3(8, 0, 5)))
    expect(f.position.x).toBeLessThanOrEqual(8 - 0.4 - 0.625 + 1e-9)
    expect(f.hasCategory(Category.HAZARD)).toBe(false)
  })

  it('is solid in his way', () => {
    expect(blockFillsAt([new Follower(5, 0, 5)], 5, 5, 0, 2)).toBe(true)
  })

  it('stops at a block column', () => {
    const grid = new Grid(8, 8)
    grid.setSolid(4, 2, true)
    grid.setSupport(4, 2, 1)
    const f = new Follower(5, 0, 5)
    runFrames(f, 20, { ...ctx(new THREE.Vector3(13, 0, 5)), grid })
    expect(f.position.x).toBeLessThanOrEqual(8 - 0.625 + 1e-9)
  })
})
