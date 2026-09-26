import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { VanishingBlock, VANISH_AFTER_FRAMES } from '../../src/game/VanishingBlock'
import { runFrames } from './frames'

function run(b: VanishingBlock, rider: THREE.Vector3, frames: number): void {
  runFrames(b, frames, { playerPosition: rider })
}

// The original's collapsing block: handler at 0xB6A2, then 0xBF2B and 0xBF37.
describe('VanishingBlock', () => {
  it('supports from above while present and nothing while gone', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    expect(b.present).toBe(true)
    expect(b.supportAt(5, 5, 1)).toBe(1)
    expect(b.supportAt(5, 5, 0)).toBeNull()
  })

  it('is gone two frames after someone lands on it', () => {
    expect(VANISH_AFTER_FRAMES).toBe(2)
    const b = new VanishingBlock(2, 2, 1, 2)
    const rider = new THREE.Vector3(5, 1, 5)
    run(b, rider, VANISH_AFTER_FRAMES - 1)
    expect(b.present).toBe(true)
    run(b, rider, 1)
    expect(b.present).toBe(false)
    expect(b.supportAt(5, 5, 1)).toBeNull()
  })

  it('does not crumble for someone on the floor beside it', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    run(b, new THREE.Vector3(5, 0, 5), 20)
    expect(b.present).toBe(true)
  })

  it('stays gone for as long as Sabreman is in the room', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    run(b, new THREE.Vector3(5, 1, 5), VANISH_AFTER_FRAMES)
    run(b, new THREE.Vector3(0, 0, 0), 500)
    expect(b.present).toBe(false)
  })

  it('is back when the room is re-entered (reset)', () => {
    const b = new VanishingBlock(2, 2, 1, 2)
    run(b, new THREE.Vector3(5, 1, 5), VANISH_AFTER_FRAMES)
    b.reset()
    expect(b.present).toBe(true)
  })
})
