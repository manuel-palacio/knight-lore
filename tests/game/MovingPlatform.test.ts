import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { MovingPlatform } from '../../src/game/MovingPlatform'
import { STEP_LENGTH, TICKS_PER_STEP } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'
import { Category } from '../../src/engine/categories'

function platform(): MovingPlatform {
  return new MovingPlatform({ x: 3, z: 5 }, { x: 7, z: 5 }, 1)
}

function ride(p: MovingPlatform, rider: THREE.Vector3, ticks: number): void {
  for (let i = 0; i < ticks; i++) p.update(SIMULATION_DT, { playerPosition: rider })
}

describe('MovingPlatform', () => {
  it('is a support surface, not a hazard', () => {
    const p = platform()
    expect(p.hasCategory(Category.SUPPORT_SURFACE)).toBe(true)
    expect(p.hasCategory(Category.HAZARD)).toBe(false)
  })

  it('moves one step toward its far end every step tick', () => {
    const p = platform()
    ride(p, new THREE.Vector3(0, 0, 0), TICKS_PER_STEP - 1)
    expect(p.position.x).toBe(3)
    ride(p, new THREE.Vector3(0, 0, 0), 1)
    expect(p.position.x).toBe(3 + STEP_LENGTH)
  })

  it('reverses at the far end and comes back', () => {
    const p = platform()
    const stepsAcross = 4 / STEP_LENGTH
    ride(p, new THREE.Vector3(0, 0, 0), stepsAcross * TICKS_PER_STEP)
    expect(p.position.x).toBe(7)
    ride(p, new THREE.Vector3(0, 0, 0), TICKS_PER_STEP)
    expect(p.position.x).toBe(7 - STEP_LENGTH)
  })

  it('reports its top height under points inside its footprint only', () => {
    const p = platform()
    expect(p.supportAt(3, 5)).toBe(1)
    expect(p.supportAt(3.7, 5.7)).toBe(1)
    expect(p.supportAt(4.5, 5)).toBeNull()
    expect(p.supportAt(3, 7)).toBeNull()
  })

  it('carries a rider standing on top by the same amount it moves', () => {
    const p = platform()
    const rider = new THREE.Vector3(3, 1, 5)
    ride(p, rider, TICKS_PER_STEP * 3)
    expect(rider.x).toBe(3 + 3 * STEP_LENGTH)
    expect(rider.z).toBe(5)
  })

  it('leaves a body on the floor beneath it alone', () => {
    const p = platform()
    const below = new THREE.Vector3(3, 0, 5)
    ride(p, below, TICKS_PER_STEP * 3)
    expect(below.x).toBe(3)
  })
})
