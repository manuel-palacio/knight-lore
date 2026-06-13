import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Cauldron, DANGER_GRACE } from '../../src/game/Cauldron'
import { GameState } from '../../src/game/GameState'

describe('Cauldron', () => {
  it('is in range horizontally near the rim, out of range across the room', () => {
    const c = new Cauldron()
    c.position.set(8, 1, 8)
    expect(c.isInRange(new THREE.Vector3(8.8, 1, 8))).toBe(true)
    expect(c.isInRange(new THREE.Vector3(8, 0, 9.2))).toBe(true)
    expect(c.isInRange(new THREE.Vector3(2, 0, 2))).toBe(false)
  })

  it('out of range when far below/above (no delivering from under the platform)', () => {
    const c = new Cauldron()
    c.position.set(8, 1, 8)
    expect(c.isInRange(new THREE.Vector3(8, 4.5, 8))).toBe(false)
  })

  it('werewolf in the room loses a life after the grace period, then timer restarts', () => {
    const c = new Cauldron()
    const state = new GameState()
    state.toggleForm() // werewolf
    c.update(DANGER_GRACE - 0.1, { state })
    expect(state.lives).toBe(5)
    c.update(0.2, { state })
    expect(state.lives).toBe(4)
    c.update(DANGER_GRACE - 0.1, { state })
    expect(state.lives).toBe(4) // timer restarted, not yet expired again
  })

  it('human form keeps the danger timer reset', () => {
    const c = new Cauldron()
    const state = new GameState()
    state.toggleForm()
    c.update(DANGER_GRACE - 0.1, { state }) // almost expired
    state.toggleForm() // back to human
    c.update(1, { state }) // resets while human
    state.toggleForm() // werewolf again
    c.update(DANGER_GRACE - 0.1, { state })
    expect(state.lives).toBe(5)
  })

  it('resetDanger restores the full grace period', () => {
    const c = new Cauldron()
    const state = new GameState()
    state.toggleForm()
    c.update(DANGER_GRACE - 0.1, { state })
    c.resetDanger()
    c.update(DANGER_GRACE - 0.1, { state })
    expect(state.lives).toBe(5)
  })
})
