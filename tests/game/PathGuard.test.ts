import { describe, it, expect } from 'vitest'
import { PathGuard, GUARD_STEP } from '../../src/game/PathGuard'
import { Category } from '../../src/engine/categories'
import { runFrames } from './frames'

function guard(): PathGuard {
  return new PathGuard([{ x: 3, z: 3 }, { x: 5, z: 3 }, { x: 5, z: 5 }])
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

  it('walks one stride toward the next waypoint a frame', () => {
    const g = guard()
    runFrames(g, 1)
    expect(g.position.x).toBe(3 + GUARD_STEP)
    expect(g.position.z).toBe(3)
  })

  it('turns toward the following waypoint on arrival', () => {
    const g = guard()
    runFrames(g, 2 / GUARD_STEP)
    expect(g.position.x).toBe(5)
    runFrames(g, 1)
    expect(g.facing).toBe('south')
    expect(g.position.z).toBe(3 + GUARD_STEP)
  })

  it('loops back to the first waypoint after the last', () => {
    const g = guard()
    const loopFrames = (2 + 2 + Math.hypot(2, 2)) / GUARD_STEP
    runFrames(g, Math.ceil(loopFrames + 2))
    expect(g.position.x).toBeLessThan(5)
    expect(g.position.z).toBeLessThan(5)
  })

  it('counts steps so the walk cycle can animate', () => {
    const g = guard()
    runFrames(g, 3)
    expect(g.stepsTaken).toBe(3)
  })

  it('walks at the original guard speed, two pixels a frame: a quarter unit', () => {
    expect(GUARD_STEP).toBe(2 / 8)
  })
})
