import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CauldronSpirit, RISE_FRAMES, SPIRIT_STEP } from '../../src/game/CauldronSpirit'
import { GameState } from '../../src/game/GameState'
import { night } from './states'
import { hazardHunts } from '../../src/game/Hazards'
import { Room } from '../../src/game/Room'
import { runFrames } from './frames'
import { STEP_LENGTH, TICKS_PER_FRAME, TICKS_PER_STEP } from '../../src/engine/StepClock'

function ctx(state: GameState, px: number, pz: number) {
  return { state, playerPosition: new THREE.Vector3(px, 0, pz) }
}

// Set up with the room, risen to where it hovers, about to look at him.
function risenSpirit(): CauldronSpirit {
  const spirit = new CauldronSpirit(9, 9)
  runFrames(spirit, RISE_FRAMES, ctx(new GameState(1), 3, 9))
  return spirit
}

describe('CauldronSpirit', () => {
  it('stays over the cauldron while the man is in the room, and never hunts him', () => {
    const spirit = new CauldronSpirit(9, 9)
    runFrames(spirit, 100, ctx(new GameState(1), 3, 9))
    expect(spirit.risen).toBe(false)
    expect(hazardHunts(spirit)).toBe(false)
    expect(spirit.position.x).toBe(9)
  })

  it('rises sixteen frames first (0xB8EE), and only then can turn: the wolf has them to go', () => {
    expect(RISE_FRAMES).toBe(16)
    const spirit = new CauldronSpirit(9, 9)
    runFrames(spirit, RISE_FRAMES, ctx(night(), 3, 9))
    expect(spirit.risen).toBe(false)
    expect(spirit.position.x).toBe(9)
  })

  it('risen, turns on the wolf the first frame he is in the room (0xB8FD)', () => {
    const spirit = risenSpirit()
    runFrames(spirit, 1, ctx(night(), 3, 9))
    expect(spirit.risen).toBe(true)
    expect(hazardHunts(spirit)).toBe(true)
  })

  it('makes for him 4 pixels a frame along each axis (0xB942), faster than he walks', () => {
    const spirit = risenSpirit()
    runFrames(spirit, 2, ctx(night(), 3, 13))
    expect(spirit.position.x).toBeCloseTo(9 - SPIRIT_STEP, 9)
    expect(spirit.position.z).toBeCloseTo(9 + SPIRIT_STEP, 9)
    expect(SPIRIT_STEP).toBe(0.5)
    expect(SPIRIT_STEP).toBeGreaterThan((STEP_LENGTH * TICKS_PER_FRAME) / TICKS_PER_STEP)
  })

  it('stops on his line rather than overshooting it', () => {
    const spirit = risenSpirit()
    runFrames(spirit, 10, ctx(night(), 9.2, 3))
    expect(spirit.position.x).toBeCloseTo(9.2, 9)
  })

  it('once turned stays turned, into the day, and hurts the man too', () => {
    const spirit = risenSpirit()
    runFrames(spirit, 2, ctx(night(), 3, 9))
    runFrames(spirit, 2, ctx(new GameState(1), 3, 9))
    expect(spirit.risen).toBe(true)
    expect(hazardHunts(spirit)).toBe(true)
  })

  it('goes back over the cauldron when the room is set up again', () => {
    const room = new Room('test', 8, 8)
    const spirit = new CauldronSpirit(9, 9)
    room.add(spirit)
    runFrames(room, RISE_FRAMES + 4, ctx(night(), 3, 9))
    expect(spirit.risen).toBe(true)
    room.reset()
    expect(spirit.risen).toBe(false)
    expect(spirit.position.x).toBe(9)
    // and rises afresh before it can turn again
    runFrames(room, RISE_FRAMES, ctx(night(), 3, 9))
    expect(spirit.risen).toBe(false)
  })
})
