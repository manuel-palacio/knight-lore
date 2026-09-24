import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CauldronSpirit, RISE_SECONDS } from '../../src/game/CauldronSpirit'
import { GameState } from '../../src/game/GameState'
import { hazardHunts } from '../../src/game/Hazards'
import { Room } from '../../src/game/Room'

function ctx(state: GameState, px: number, pz: number) {
  return { state, playerPosition: new THREE.Vector3(px, 0, pz) }
}

function night(): GameState {
  const state = new GameState(1)
  state.toggleForm()
  return state
}

describe('CauldronSpirit', () => {
  it('is sunk in the cauldron by day and never hunts the man', () => {
    const spirit = new CauldronSpirit(9, 9)
    spirit.update(1 / 12, ctx(new GameState(1), 3, 9))
    expect(spirit.risen).toBe(false)
    expect(hazardHunts(spirit, 'human')).toBe(false)
  })

  it('takes longer to rise than the transformation takes, so the frozen wolf gets a head start', () => {
    const spirit = new CauldronSpirit(9, 9)
    spirit.update(RISE_SECONDS - 0.1, ctx(night(), 3, 9))
    expect(spirit.risen).toBe(false)
    expect(hazardHunts(spirit, 'werewolf')).toBe(false)
    expect(spirit.position.x).toBeCloseTo(9, 5)
    expect(RISE_SECONDS).toBeGreaterThan(2.2)
  })

  it('rises at night and drifts at the wolf', () => {
    const spirit = new CauldronSpirit(9, 9)
    spirit.update(RISE_SECONDS, ctx(night(), 3, 9))
    spirit.update(1, ctx(night(), 3, 9))
    expect(spirit.risen).toBe(true)
    expect(hazardHunts(spirit, 'werewolf')).toBe(true)
    expect(spirit.position.x).toBeLessThan(9)
  })

  it('rises inside a room, which only updates active entities', () => {
    const room = new Room('test', 8, 8)
    const spirit = new CauldronSpirit(9, 9)
    room.add(spirit)
    room.update(RISE_SECONDS, ctx(night(), 3, 9))
    expect(spirit.risen).toBe(true)
  })

  it('sinks back into the cauldron at dawn', () => {
    const spirit = new CauldronSpirit(9, 9)
    spirit.update(RISE_SECONDS, ctx(night(), 3, 9))
    spirit.update(1, ctx(night(), 3, 9))
    spirit.update(1 / 12, ctx(new GameState(1), 3, 9))
    expect(spirit.risen).toBe(false)
    expect(spirit.position.x).toBeCloseTo(9, 5)
    expect(spirit.position.z).toBeCloseTo(9, 5)
  })
})
