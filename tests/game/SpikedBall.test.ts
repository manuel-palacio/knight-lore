import { describe, it, expect } from 'vitest'
import { SpikedBall, SPIKED_BALL_BOB } from '../../src/game/SpikedBall'
import { hazardHunts, touchesHazard } from '../../src/game/Hazards'
import { TICKS_PER_STEP } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'

const body = (x: number, y: number, z: number) => ({ position: { x, y, z }, extents: { x: 0.8, y: 1.6, z: 0.8 } })

function run(ball: SpikedBall, steps: number): number[] {
  const heights: number[] = []
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < TICKS_PER_STEP; i++) ball.update(SIMULATION_DT, {})
    heights.push(ball.position.y)
  }
  return heights
}

describe('SpikedBall', () => {
  it('hangs at its height in the middle of its cell and hurts both forms', () => {
    const ball = new SpikedBall({ x: 3, z: 2 }, 1, false, 2)
    expect(ball.position.x).toBe(7)
    expect(ball.position.z).toBe(5)
    expect(ball.position.y).toBe(1)
    expect(hazardHunts(ball, 'human')).toBe(true)
    expect(hazardHunts(ball, 'werewolf')).toBe(true)
  })

  it('hurts Sabreman walking into it at its height, not passing under a high one', () => {
    const low = new SpikedBall({ x: 3, z: 2 }, 0, false, 2)
    expect(touchesHazard(body(7, 0, 5), low)).toBe(true)
    const high = new SpikedBall({ x: 3, z: 2 }, 2, false, 2)
    expect(touchesHazard(body(7, 0, 5), high)).toBe(false)
  })

  it('stays put unless it is the bobbing kind, which rises and sinks by a block', () => {
    expect(new Set(run(new SpikedBall({ x: 3, z: 2 }, 1, false, 2), 30))).toEqual(new Set([1]))
    const heights = run(new SpikedBall({ x: 3, z: 2 }, 1, true, 2), 30)
    expect(Math.max(...heights)).toBeCloseTo(1 + SPIKED_BALL_BOB, 1)
    expect(Math.min(...heights)).toBeCloseTo(1, 1)
  })
})
