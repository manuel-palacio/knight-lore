import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { GhostEnemy, GHOST_SPEEDS_PX } from '../../src/game/GhostEnemy'
import { GameState } from '../../src/game/GameState'
import { hazardHunts } from '../../src/game/Hazards'
import { Grid } from '../../src/engine/Grid'
import { runFrames } from './frames'
import { Category } from '../../src/engine/categories'

function run(ghost: GhostEnemy, frames: number, extra: object = {}): void {
  runFrames(ghost, frames, { grid: new Grid(8, 8), tileSize: 2, ...extra })
}

// Rolls in turn: index into GHOST_SPEEDS_PX of 0 (-3), 1 (+3), 2 (-4), 3 (+4).
const rolls = (...picks: number[]) => {
  let i = 0
  return () => (picks[i++ % picks.length]! + 0.5) / GHOST_SPEEDS_PX.length
}

// The original's ghost: handler at 0xC5C8.
describe('GhostEnemy', () => {
  it('is a hazard that hurts the man as much as the wolf', () => {
    const g = new GhostEnemy(8, 8)
    expect(g.hasCategory(Category.HAZARD)).toBe(true)
    expect(hazardHunts(g, 'human')).toBe(true)
    expect(hazardHunts(g, 'werewolf')).toBe(true)
  })

  it('drifts on a diagonal three or four pixels a frame on each axis (table at 0xC64E)', () => {
    expect(GHOST_SPEEDS_PX).toEqual([-3, 3, -4, 4])
    const g = new GhostEnemy(8, 8, rolls(1, 2))
    run(g, 1)
    expect(g.heading).toEqual({ x: 3 / 8, z: -4 / 8 })
    run(g, 2)
    expect(g.position.x).toBeCloseTo(8 + 2 * (3 / 8), 5)
    expect(g.position.z).toBeCloseTo(8 - 2 * (4 / 8), 5)
  })

  it('picks a new heading when a wall stops it', () => {
    const g = new GhostEnemy(8, 8, rolls(3, 3, 0, 0))
    run(g, 1)
    run(g, 30)
    expect(g.heading.x).toBeLessThan(0)
    expect(g.position.x).toBeLessThan(16)
  })

  it('picks a new heading when a block stops it', () => {
    const grid = new Grid(8, 8)
    grid.setSupport(5, 4, 1)
    const g = new GhostEnemy(8, 9, rolls(3, 1, 0, 0))
    run(g, 1, { grid })
    run(g, 6, { grid })
    expect(g.heading.x).toBeLessThan(0)
    expect(g.position.x).toBeLessThan(10)
  })

  it('pays Sabreman no mind: man or wolf, it drifts the same', () => {
    const drift = (state: GameState) => {
      const g = new GhostEnemy(8, 8, rolls(1, 3, 0, 2))
      run(g, 12, { state, playerPosition: new THREE.Vector3(2, 0, 2) })
      return { x: g.position.x, z: g.position.z }
    }
    const wolf = new GameState(1)
    wolf.toggleForm()
    expect(drift(wolf)).toEqual(drift(new GameState(1)))
  })
})
