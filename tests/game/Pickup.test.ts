import { describe, it, expect } from 'vitest'
import { Pickup } from '../../src/game/Pickup'
import { Room } from '../../src/game/Room'

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
