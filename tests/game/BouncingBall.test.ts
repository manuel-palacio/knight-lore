import { describe, it, expect } from 'vitest'
import { BouncingBall, BOUNCE_HEIGHT } from '../../src/game/BouncingBall'
import { STEP_LENGTH, TICKS_PER_STEP } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'
import { Category } from '../../src/engine/categories'

function run(b: BouncingBall, steps: number): void {
  for (let i = 0; i < steps * TICKS_PER_STEP; i++) b.update(SIMULATION_DT, {})
}

describe('BouncingBall', () => {
  it('is a hazard that starts on the floor at its first point', () => {
    const b = new BouncingBall({ x: 3, z: 5 }, { x: 9, z: 5 })
    expect(b.hasCategory(Category.HAZARD)).toBe(true)
    expect(b.position.y).toBe(0)
  })

  it('travels one step per step tick and reverses at the far end', () => {
    const b = new BouncingBall({ x: 3, z: 5 }, { x: 5, z: 5 })
    run(b, 1)
    expect(b.position.x).toBe(3 + STEP_LENGTH)
    run(b, 7)
    expect(b.position.x).toBe(5)
    run(b, 1)
    expect(b.position.x).toBe(5 - STEP_LENGTH)
  })

  it('rises to its bounce height and comes back down every bounce', () => {
    const b = new BouncingBall({ x: 3, z: 5 }, { x: 9, z: 5 })
    let peak = 0
    let landings = 0
    let wasUp = false
    for (let i = 0; i < 40; i++) {
      run(b, 1)
      peak = Math.max(peak, b.position.y)
      if (wasUp && b.position.y === 0) landings++
      wasUp = b.position.y > 0
    }
    expect(peak).toBeCloseTo(BOUNCE_HEIGHT, 5)
    expect(landings).toBeGreaterThanOrEqual(2)
  })
})
