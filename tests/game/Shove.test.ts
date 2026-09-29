import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { shovedClearOf } from '../../src/game/Shove'
import { Grid } from '../../src/engine/Grid'

const body = (x: number, y: number, z: number, w = 0.8, h = 1.6) => ({ position: new THREE.Vector3(x, y, z), extents: new THREE.Vector3(w, h, w) })
const room = (grid = new Grid(8, 8)) => ({ grid, tileSize: 2 })

// Out of a guard's (or a shut grille's) body, the shorter way.
describe('shovedClearOf', () => {
  it('moves him out of a body he overlaps, the shorter way', () => {
    expect(shovedClearOf(body(5.5, 0, 5), body(5, 0, 5), room())).toEqual({ x: 5.8, z: 5 })
  })

  it('leaves him be above it: a jump over a guard is not a shove', () => {
    expect(shovedClearOf(body(5.5, 1.7, 5), body(5, 0, 5), room())).toBeNull()
  })

  it('does not shove him into a block, nor out of the room', () => {
    const grid = new Grid(8, 8)
    grid.setSolid(3, 2, true)
    grid.setSupport(3, 2, 1)
    expect(shovedClearOf(body(5.5, 0, 5), body(5, 0, 5), room(grid))).toBeNull()
    expect(shovedClearOf(body(0.3, 0, 5), body(0.8, 0, 5), room())).toBeNull()
  })
})
