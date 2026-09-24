import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CauldronSpirit } from '../../src/game/CauldronSpirit'
import { GameState } from '../../src/game/GameState'
import { Category } from '../../src/engine/categories'

function ctx(state: GameState, px: number, pz: number) {
  return { state, playerPosition: new THREE.Vector3(px, 0, pz) }
}

function night(): GameState {
  const state = new GameState(1)
  state.toggleForm()
  return state
}

describe('CauldronSpirit', () => {
  it('is a hazard', () => {
    expect(new CauldronSpirit(9, 9).hasCategory(Category.HAZARD)).toBe(true)
  })

  it('is absent by day: inactive, so it neither shows nor hurts', () => {
    const spirit = new CauldronSpirit(9, 9)
    expect(spirit.active).toBe(false)
    spirit.update(1 / 12, ctx(new GameState(1), 3, 9))
    expect(spirit.active).toBe(false)
  })

  it('rises at night and drifts at the wolf', () => {
    const spirit = new CauldronSpirit(9, 9)
    spirit.update(1, ctx(night(), 3, 9))
    expect(spirit.active).toBe(true)
    expect(spirit.position.x).toBeLessThan(9)
  })

  it('sinks back into the cauldron at dawn', () => {
    const spirit = new CauldronSpirit(9, 9)
    spirit.update(1, ctx(night(), 3, 9))
    spirit.update(1 / 12, ctx(new GameState(1), 3, 9))
    expect(spirit.active).toBe(false)
    expect(spirit.position.x).toBeCloseTo(9, 5)
    expect(spirit.position.z).toBeCloseTo(9, 5)
  })
})
