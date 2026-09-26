import { describe, it, expect } from 'vitest'
import { Portcullis, PORTCULLIS_REST_STEPS, PORTCULLIS_TOP, PORTCULLIS_OPEN_STEPS } from '../../src/game/Portcullis'
import { hazardHunts } from '../../src/game/Hazards'
import { TICKS_PER_STEP } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'

const TILE = 2

function run(gate: Portcullis, steps: number): void {
  for (let i = 0; i < steps * TICKS_PER_STEP; i++) gate.update(SIMULATION_DT, {})
}

function runUntil(gate: Portcullis, done: (g: Portcullis) => boolean, maxSteps = 500): number {
  for (let step = 1; step <= maxSteps; step++) {
    run(gate, 1)
    if (done(gate)) return step
  }
  throw new Error('never happened')
}

describe('Portcullis', () => {
  const across = () => new Portcullis({ x: 0, z: 5 }, { x: 7, z: 5 }, TILE)

  it('spans the cells of its line and starts shut, blocking the way', () => {
    const gate = across()
    expect(gate.state).toBe('shut')
    expect(gate.bottom).toBe(0)
    expect(gate.blocking).toBe(true)
    expect(gate.position.x).toBe(8)
    expect(gate.position.z).toBe(11)
    expect(gate.extents.x).toBe(16)
  })

  it('rests shut, then rises a twelfth of a block per step to the top', () => {
    const gate = across()
    run(gate, PORTCULLIS_REST_STEPS)
    expect(gate.state).toBe('rising')
    const bottom = gate.bottom
    run(gate, 1)
    expect(gate.bottom - bottom).toBeCloseTo(1 / 12, 5)
    runUntil(gate, (g) => g.state === 'open')
    expect(gate.bottom).toBeCloseTo(PORTCULLIS_TOP, 5)
    expect(gate.blocking).toBe(false)
  })

  it('stays open a while, then falls faster every step until it is shut again', () => {
    const gate = across()
    runUntil(gate, (g) => g.state === 'open')
    run(gate, PORTCULLIS_OPEN_STEPS)
    expect(gate.state).toBe('falling')
    const drops: number[] = []
    let last = gate.bottom
    runUntil(gate, (g) => {
      drops.push(last - g.bottom)
      last = g.bottom
      return g.state === 'shut'
    })
    expect(drops[1]!).toBeGreaterThan(drops[0]!)
    expect(gate.bottom).toBe(0)
  })

  it('crushes only while it falls', () => {
    const gate = across()
    expect(hazardHunts(gate, 'human')).toBe(false)
    runUntil(gate, (g) => g.state === 'falling')
    expect(hazardHunts(gate, 'human')).toBe(true)
    expect(hazardHunts(gate, 'werewolf')).toBe(true)
  })

  it('lies along either axis', () => {
    const down = new Portcullis({ x: 2, z: 3 }, { x: 2, z: 4 }, TILE)
    expect(down.extents.z).toBe(4)
    expect(down.extents.x).toBeLessThan(1)
  })

  it('starts shut again when the room is re-entered', () => {
    const gate = across()
    runUntil(gate, (g) => g.state === 'open')
    gate.reset()
    expect(gate.state).toBe('shut')
    expect(gate.bottom).toBe(0)
  })
})
