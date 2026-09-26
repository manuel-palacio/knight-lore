import { describe, it, expect } from 'vitest'
import { Pickup, CHARM_HEIGHT } from '../../src/game/Pickup'
import { Room } from '../../src/game/Room'

describe('Pickup', () => {
  it('deactivates immediately on collect', () => {
    const pickup = new Pickup('goblet', 'test-room')
    pickup.collect()
    expect(pickup.active).toBe(false)
    expect(pickup.collected).toBe(true)
  })

  it('bobs its drawn height around the simulation height while uncollected', () => {
    const room = new Room('test', 8, 8)
    const pickup = new Pickup('goblet', 'test-room')
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
    const pickup = new Pickup('goblet', 'test-room')
    room.add(pickup)
    pickup.collect()
    for (let i = 0; i < 60; i++) room.update(1 / 60, {})
    expect(pickup.bobOffset).toBe(0)
  })
})

describe('Pickup as a stepping stone', () => {
  it('holds from above, one block high, over the floor it lies on', () => {
    const charm = new Pickup('gem', 'test-room')
    charm.dropAt(4, 0.4, 4)
    expect(charm.supportAt(4, 4, 1)).toBe(CHARM_HEIGHT)
    expect(charm.supportAt(4, 4, 0)).toBeNull()
    expect(charm.supportAt(6, 4, 1)).toBeNull()
  })

  it('stands a block above the block it was dropped on', () => {
    const charm = new Pickup('gem', 'test-room')
    charm.dropAt(4, 2 + 0.4, 4)
    expect(charm.supportAt(4, 4, 3)).toBe(2 + CHARM_HEIGHT)
  })

  it('holds nothing once picked up', () => {
    const charm = new Pickup('gem', 'test-room')
    charm.dropAt(4, 0.4, 4)
    charm.collect()
    expect(charm.supportAt(4, 4, 1)).toBeNull()
  })
})
