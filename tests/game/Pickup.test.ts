import { describe, it, expect } from 'vitest'
import { Pickup, CHARM_HEIGHT, CHARM_HOVER } from '../../src/game/Pickup'
import { Room } from '../../src/game/Room'
import { Grid } from '../../src/engine/Grid'
import { FloatingBlock } from '../../src/game/FloatingBlock'
import { runFrames } from './frames'

describe('Pickup', () => {
  it('deactivates immediately on collect', () => {
    const pickup = new Pickup('goblet')
    pickup.collect()
    expect(pickup.active).toBe(false)
    expect(pickup.collected).toBe(true)
  })

  it('bobs its drawn height around the simulation height while uncollected', () => {
    const room = new Room('test', 8, 8)
    const pickup = new Pickup('goblet')
    pickup.position.set(4, 0.4, 4)
    room.add(pickup)
    expect(pickup.bobOffset).toBe(0)
    for (let i = 0; i < 60; i++) room.update(1 / 60, {})
    expect(pickup.bobOffset).not.toBe(0)
    expect(Math.abs(pickup.bobOffset)).toBeLessThan(0.1)
    expect(pickup.position.y).toBe(0.4)
  })

  it('stops bobbing once carried because inactive entities are not updated', () => {
    const room = new Room('test', 8, 8)
    const pickup = new Pickup('goblet')
    room.add(pickup)
    pickup.collect()
    for (let i = 0; i < 60; i++) room.update(1 / 60, {})
    expect(pickup.bobOffset).toBe(0)
  })
})

describe('Pickup as a stepping stone', () => {
  it('holds from above, one block high, over the floor it lies on', () => {
    const charm = new Pickup('gem')
    charm.dropAt(4, 0.4, 4)
    expect(charm.supportAt(4, 4, 1)).toBe(CHARM_HEIGHT)
    expect(charm.supportAt(4, 4, 0)).toBeNull()
    expect(charm.supportAt(6, 4, 1)).toBeNull()
  })

  it('stands a block above the block it was dropped on', () => {
    const charm = new Pickup('gem')
    charm.dropAt(4, 2 + 0.4, 4)
    expect(charm.supportAt(4, 4, 3)).toBe(2 + CHARM_HEIGHT)
  })

  it('holds nothing once picked up', () => {
    const charm = new Pickup('gem')
    charm.dropAt(4, 0.4, 4)
    charm.collect()
    expect(charm.supportAt(4, 4, 1)).toBeNull()
  })

  describe('reach', () => {
    const charm = new Pickup('goblet')
    charm.position.set(4, 0.4, 4)

    it('is in reach of him standing beside it', () => {
      expect(charm.isWithinReachOf({ x: 5, y: 0, z: 4 })).toBe(true)
    })

    it('stays in reach while he jumps a block up off it', () => {
      expect(charm.isWithinReachOf({ x: 4.5, y: 0 + CHARM_HEIGHT + 1, z: 4 })).toBe(true)
    })

    it('is out of reach a stride away, or far below him', () => {
      expect(charm.isWithinReachOf({ x: 6, y: 0, z: 4 })).toBe(false)
      expect(charm.isWithinReachOf({ x: 4, y: 3, z: 4 })).toBe(false)
    })
  })

  describe('falling', () => {
    const room = (grid = new Grid(8, 8), entities: unknown[] = []) => ({ grid, tileSize: 2, entities })

    it('falls from where it was let go in the air to the floor, as the original drops things', () => {
      const charm = new Pickup('gem')
      charm.position.set(5, 3 + CHARM_HOVER, 5)
      runFrames(charm, 40, room())
      expect(charm.position.y).toBeCloseTo(CHARM_HOVER, 9)
    })

    it('comes to rest on a block under it', () => {
      const grid = new Grid(8, 8)
      grid.setSolid(2, 2, true)
      grid.setSupport(2, 2, 1)
      const charm = new Pickup('gem')
      charm.position.set(5, 3 + CHARM_HOVER, 5)
      runFrames(charm, 40, room(grid))
      expect(charm.position.y).toBeCloseTo(1 + CHARM_HOVER, 9)
    })

    it('stays where it lies on something that holds it, a floating block say', () => {
      const block = new FloatingBlock(2, 2, 3, 2) // its top at 4
      const charm = new Pickup('gem')
      charm.position.set(5, 4 + CHARM_HOVER, 5)
      runFrames(charm, 40, room(new Grid(8, 8), [block, charm]))
      expect(charm.position.y).toBeCloseTo(4 + CHARM_HOVER, 9)
    })
  })
})
