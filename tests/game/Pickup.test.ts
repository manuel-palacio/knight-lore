import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Pickup } from '../../src/game/Pickup'
import { Room } from '../../src/game/Room'

describe('Pickup carry', () => {
  it('keeps its carried local offset once collected (render updates skip it)', () => {
    const room = new Room('test', 8, 8)
    const pickup = new Pickup('goblet')
    pickup.object3D = new THREE.Object3D()
    pickup.position.set(11, 2.2, 11)
    room.add(pickup)

    const carrier = new THREE.Object3D()
    carrier.add(pickup.object3D)
    pickup.object3D.position.set(0, 1.2, 0)
    pickup.collect()

    room.updateRenderPositions()
    expect(pickup.object3D.position.x).toBe(0)
    expect(pickup.object3D.position.y).toBe(1.2)
    expect(pickup.object3D.position.z).toBe(0)
  })

  it('deactivates immediately on collect (no one-frame clobber window)', () => {
    const pickup = new Pickup('goblet')
    pickup.collect()
    expect(pickup.active).toBe(false)
    expect(pickup.collected).toBe(true)
  })

  it('still follows its render position while uncollected', () => {
    const room = new Room('test', 8, 8)
    const pickup = new Pickup('goblet')
    pickup.object3D = new THREE.Object3D()
    pickup.position.set(4, 0, 4)
    room.add(pickup)

    room.updateRenderPositions(1)
    expect(pickup.object3D.position.x).toBeCloseTo(4, 5)
    expect(pickup.object3D.position.z).toBeCloseTo(4, 5)
  })
})
