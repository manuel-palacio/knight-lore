import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { HoppingBall, HOP_SPEED_PX, HOP_ACROSS_PX } from '../../src/game/HoppingBall'
import { GameState } from '../../src/game/GameState'
import { Grid } from '../../src/engine/Grid'
import { runFrames } from './frames'

function run(ball: HoppingBall, frames: number, extra: object): void {
  runFrames(ball, frames, { grid: new Grid(8, 8), tileSize: 2, ...extra })
}

function night(): GameState {
  const state = new GameState(1)
  state.toggleForm()
  return state
}

const alongX = () => 0.2
const alongZ = () => 0.8
const player = (x: number, z: number) => new THREE.Vector3(x, 0, z)

// The original's hopping ball: handler at 0xB5FF.
describe('HoppingBall', () => {
  it('springs four pixels up each time it lands', () => {
    const ball = new HoppingBall({ x: 7, z: 7 }, 0, { random: alongX })
    run(ball, 1, { state: new GameState(1), playerPosition: player(12, 7) })
    expect(ball.speedPx).toBe(HOP_SPEED_PX)
  })

  it('springs four to seven pixels in an odd-numbered room', () => {
    const ball = new HoppingBall({ x: 7, z: 7 }, 0, { randomHops: true, random: () => 0.99 })
    run(ball, 1, { state: new GameState(1), playerPosition: player(12, 7) })
    expect(ball.speedPx).toBe(HOP_SPEED_PX + 3)
  })

  it('heads away from the man, two pixels a frame', () => {
    const ball = new HoppingBall({ x: 7, z: 7 }, 0, { random: alongX })
    run(ball, 1, { state: new GameState(1), playerPosition: player(12, 7) })
    expect(ball.heading).toEqual({ x: -HOP_ACROSS_PX / 8, z: 0 })
  })

  it('heads towards the wolf', () => {
    const ball = new HoppingBall({ x: 7, z: 7 }, 0, { random: alongX })
    run(ball, 1, { state: night(), playerPosition: player(12, 7) })
    expect(ball.heading).toEqual({ x: HOP_ACROSS_PX / 8, z: 0 })
  })

  it('goes along x or along z, at random', () => {
    const ball = new HoppingBall({ x: 7, z: 7 }, 0, { random: alongZ })
    run(ball, 1, { state: night(), playerPosition: player(7, 2) })
    expect(ball.heading).toEqual({ x: 0, z: -HOP_ACROSS_PX / 8 })
  })

  it('closes on the wolf hop by hop, and stops at a wall', () => {
    const ball = new HoppingBall({ x: 7, z: 7 }, 0, { random: alongX })
    run(ball, 20, { state: night(), playerPosition: player(40, 7) })
    expect(ball.position.x).toBeCloseTo(7 + 20 * 0.25 - 0.25, 5)
    run(ball, 100, { state: night(), playerPosition: player(40, 7) })
    const gap = 16 - (ball.position.x + 0.4)
    expect(gap).toBeGreaterThanOrEqual(0)
    expect(gap).toBeLessThan(0.25)
  })
})
