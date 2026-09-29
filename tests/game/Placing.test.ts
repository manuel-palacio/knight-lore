import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { headroomToLiftOnto, insideRoom } from '../../src/game/Placing'
import { FloatingBlock } from '../../src/game/FloatingBlock'
import { VanishingBlock } from '../../src/game/VanishingBlock'
import { Grid } from '../../src/engine/Grid'

const him = { extents: new THREE.Vector3(0.8, 1.6, 0.8) }

describe('headroomToLiftOnto', () => {
  it('has none under a block hanging where a charm would lift his head', () => {
    const block = new FloatingBlock(2, 2, 2, 2) // level 2 to 3 over cell (2, 2)
    expect(headroomToLiftOnto([block], him, new THREE.Vector3(5, 0, 5))).toBe(false)
  })

  it('has room once a crumbling block over him has gone', () => {
    const block = new VanishingBlock(2, 2, 3, 2) // its top at 3, under it level 2
    block.present = false
    expect(headroomToLiftOnto([block], him, new THREE.Vector3(5, 0, 5))).toBe(true)
  })

  it('has room with nothing overhead', () => {
    expect(headroomToLiftOnto([], him, new THREE.Vector3(5, 0, 5))).toBe(true)
  })
})

describe('insideRoom', () => {
  it('brings a point beyond the edge (under a door arch) back inside the room, a half-width in', () => {
    expect(insideRoom({ x: -0.6, z: 8 }, new Grid(8, 8), 2, 0.3)).toEqual({ x: 0.3, z: 8 })
    expect(insideRoom({ x: 8, z: 16.7 }, new Grid(8, 8), 2, 0.3)).toEqual({ x: 8, z: 15.7 })
    expect(insideRoom({ x: 5, z: 5 }, new Grid(8, 8), 2, 0.3)).toEqual({ x: 5, z: 5 })
  })
})
