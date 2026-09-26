import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { VanishingBlock, VANISH_AFTER_STEPS } from '../../src/game/VanishingBlock'
import { TICKS_PER_STEP } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'

function run(b: VanishingBlock, rider: THREE.Vector3, steps: number): void {
  for (let i = 0; i < steps * TICKS_PER_STEP; i++) b.update(SIMULATION_DT, { playerPosition: rider })
}

describe('VanishingBlock', () => {
  it('supports from above while present and nothing while gone', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    expect(b.present).toBe(true)
    expect(b.supportAt(5, 5, 1)).toBe(1)
    expect(b.supportAt(5, 5, 0)).toBeNull()
  })

  it('vanishes a fixed number of steps after someone stands on it', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    const rider = new THREE.Vector3(5, 1, 5)
    run(b, rider, VANISH_AFTER_STEPS - 1)
    expect(b.present).toBe(true)
    run(b, rider, 1)
    expect(b.present).toBe(false)
    expect(b.supportAt(5, 5, 1)).toBeNull()
  })

  it('does not start its countdown for someone on the floor beside it', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    run(b, new THREE.Vector3(5, 0, 5), VANISH_AFTER_STEPS + 5)
    expect(b.present).toBe(true)
  })

  it('stays gone for as long as Sabreman is in the room, as the original collapsing block does', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    run(b, new THREE.Vector3(5, 1, 5), VANISH_AFTER_STEPS)
    expect(b.present).toBe(false)
    run(b, new THREE.Vector3(0, 0, 0), 500)
    expect(b.present).toBe(false)
  })

  it('is back when the room is re-entered (reset)', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    run(b, new THREE.Vector3(5, 1, 5), VANISH_AFTER_STEPS)
    b.reset()
    expect(b.present).toBe(true)
  })
})

describe('VanishingBlock timing', () => {
  it('holds long enough to walk across it (eight steps) and turn once', () => {
    expect(VANISH_AFTER_STEPS).toBeGreaterThan(8 + 1)
  })
})
