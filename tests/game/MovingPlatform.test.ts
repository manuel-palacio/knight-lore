import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { MovingPlatform, PLATFORM_STEP } from '../../src/game/MovingPlatform'
import { Pickup, CHARM_HOVER } from '../../src/game/Pickup'
import { Grid } from '../../src/engine/Grid'
import { TICKS_PER_FRAME } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'
import { runFrames } from './frames'
import { Category } from '../../src/engine/categories'

const HIS_SIZE = new THREE.Vector3(0.8, 1.6, 0.8)

function platform(): MovingPlatform {
  return new MovingPlatform({ x: 3, z: 5 }, { x: 7, z: 5 }, 1)
}

function ride(p: MovingPlatform, rider: THREE.Vector3, frames: number): void {
  runFrames(p, frames, { playerPosition: rider })
}

describe('MovingPlatform', () => {
  it('is a support surface, not a hazard', () => {
    const p = platform()
    expect(p.hasCategory(Category.SUPPORT_SURFACE)).toBe(true)
    expect(p.hasCategory(Category.HAZARD)).toBe(false)
  })

  it('moves one stride toward its far end on each frame of the original\'s clock', () => {
    const p = platform()
    const rider = { playerPosition: new THREE.Vector3(0, 0, 0) }
    for (let i = 0; i < Math.ceil(TICKS_PER_FRAME) - 1; i++) p.update(SIMULATION_DT, rider)
    expect(p.position.x).toBe(3)
    p.update(SIMULATION_DT, rider)
    expect(p.position.x).toBe(3 + PLATFORM_STEP)
  })

  it('reverses at the far end and comes back', () => {
    const p = platform()
    const framesAcross = 4 / PLATFORM_STEP
    ride(p, new THREE.Vector3(0, 0, 0), framesAcross)
    expect(p.position.x).toBe(7)
    ride(p, new THREE.Vector3(0, 0, 0), 1)
    expect(p.position.x).toBe(7 - PLATFORM_STEP)
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
    ride(p, rider, 3)
    expect(rider.x).toBe(3 + 3 * PLATFORM_STEP)
    expect(rider.z).toBe(5)
  })

  it('leaves a body on the floor beneath it alone', () => {
    const p = platform()
    const below = new THREE.Vector3(3, 0, 5)
    ride(p, below, 3)
    expect(below.x).toBe(3)
  })

  it('waits while he stands in its way, without pushing him, and moves on once he steps clear', () => {
    const p = platform()
    const him = new THREE.Vector3(4.5, 0, 5)
    runFrames(p, 8, { playerPosition: him, playerExtents: HIS_SIZE })
    expect(p.position.x).toBe(3)
    expect(him.x).toBe(4.5)
    him.z = 7
    runFrames(p, 8, { playerPosition: him, playerExtents: HIS_SIZE })
    expect(p.position.x).toBe(3 + 8 * PLATFORM_STEP)
  })

  it('a block high up is one block thick and passes over his head', () => {
    const high = new MovingPlatform({ x: 3, z: 5 }, { x: 7, z: 5 }, 4)
    expect(high.bottom).toBe(3)
    const him = new THREE.Vector3(4.5, 0, 5)
    runFrames(high, 8, { playerPosition: him, playerExtents: HIS_SIZE })
    expect(high.position.x).toBe(4)
  })

  it('moves at the original moving block speed, one pixel a frame: an eighth of a unit', () => {
    expect(PLATFORM_STEP).toBe(1 / 8)
  })

  it('waits for a charm lying in its way, as for anything the original\'s collision meets', () => {
    const p = platform()
    const charm = new Pickup('gem')
    charm.position.set(6, 0 + CHARM_HOVER, 5) // on its way from x 3 to x 7
    runFrames(p, 40, { entities: [p, charm] })
    expect(p.position.x).toBeLessThanOrEqual(6 - 1 - 0.3 + 1e-6)
  })

  it('waits rather than carry its rider into a column', () => {
    const grid = new Grid(8, 8)
    grid.setSolid(4, 2, true)
    grid.setSupport(4, 2, 2) // a column two high in cell (4, 2): x 8 to 10, z 4 to 6
    const p = platform()
    const rider = new THREE.Vector3(3.9, 1, 5) // on its east edge, heading east
    runFrames(p, 60, { grid, tileSize: 2, playerPosition: rider, playerExtents: new THREE.Vector3(0.8, 1.6, 0.8) })
    expect(rider.x + 0.4).toBeLessThanOrEqual(8 + 1e-6)
  })
})
