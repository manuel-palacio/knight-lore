import { describe, it, expect } from 'vitest'
import { PathGuard } from '../../src/game/PathGuard'
import { STEP_LENGTH, TICKS_PER_STEP } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'
import { Category } from '../../src/engine/categories'

function guard(): PathGuard {
  return new PathGuard([{ x: 3, z: 3 }, { x: 5, z: 3 }, { x: 5, z: 5 }])
}

function run(g: PathGuard, ticks: number): void {
  for (let i = 0; i < ticks; i++) g.update(SIMULATION_DT, {})
}

describe('PathGuard', () => {
  it('is a solid actor and a hazard', () => {
    const g = guard()
    expect(g.hasCategory(Category.ACTOR_BODY)).toBe(true)
    expect(g.hasCategory(Category.HAZARD)).toBe(true)
  })

  it('starts on the first waypoint facing the second', () => {
    const g = guard()
    expect(g.position.x).toBe(3)
    expect(g.facing).toBe('east')
  })

  it('walks one step toward the next waypoint per step tick', () => {
    const g = guard()
    run(g, TICKS_PER_STEP)
    expect(g.position.x).toBe(3 + STEP_LENGTH)
    expect(g.position.z).toBe(3)
  })

  it('turns toward the following waypoint on arrival', () => {
    const g = guard()
    run(g, (2 / STEP_LENGTH) * TICKS_PER_STEP)
    expect(g.position.x).toBe(5)
    run(g, TICKS_PER_STEP)
    expect(g.facing).toBe('south')
    expect(g.position.z).toBe(3 + STEP_LENGTH)
  })

  it('loops back to the first waypoint after the last', () => {
    const g = guard()
    const loopSteps = (2 + 2 + Math.hypot(2, 2)) / STEP_LENGTH
    run(g, Math.ceil(loopSteps + 2) * TICKS_PER_STEP)
    expect(g.position.x).toBeLessThan(5)
    expect(g.position.z).toBeLessThan(5)
  })

  it('counts steps so the walk cycle can animate', () => {
    const g = guard()
    run(g, TICKS_PER_STEP * 3)
    expect(g.stepsTaken).toBe(3)
  })
})
