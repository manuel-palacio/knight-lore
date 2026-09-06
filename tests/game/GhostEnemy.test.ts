import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { GhostEnemy, GHOST_SPEED, WEREWOLF_AGGRESSION } from '../../src/game/GhostEnemy'
import { GameState } from '../../src/game/GameState'
import { Category } from '../../src/engine/categories'

function ctx(state: GameState, px: number, pz: number) {
  return { state, playerPosition: new THREE.Vector3(px, 0, pz) }
}

describe('GhostEnemy', () => {
  it('is a HAZARD but not a solid actor (passes through everything)', () => {
    const g = new GhostEnemy(4, 4)
    expect(g.hasCategory(Category.HAZARD)).toBe(true)
    expect(g.hasCategory(Category.ACTOR_BODY)).toBe(false)
  })

  it('hovers in place while Sabreman is human: it has no interest in the man', () => {
    const g = new GhostEnemy(4, 4)
    const state = new GameState()
    g.update(1, ctx(state, 10, 4))
    expect(g.position.x).toBeCloseTo(4, 5)
    expect(g.position.z).toBeCloseTo(4, 5)
  })


  it('is faster against the werewolf', () => {
    const g = new GhostEnemy(4, 4)
    const state = new GameState()
    state.toggleForm()
    g.update(1, ctx(state, 10, 4))
    expect(g.position.x).toBeCloseTo(4 + GHOST_SPEED * WEREWOLF_AGGRESSION, 5)
  })

  it('floats at a fixed height and does not overshoot a near player', () => {
    const g = new GhostEnemy(4, 4)
    const state = new GameState()
    g.update(1, ctx(state, 4.05, 4))
    expect(g.position.x).toBeLessThanOrEqual(4.05)
    expect(g.position.y).toBeGreaterThan(0)
  })
})
