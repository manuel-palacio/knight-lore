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

  it('bobs the rendered Y around the simulation Y while uncollected', () => {
    const room = new Room('test', 8, 8)
    const pickup = new Pickup('goblet')
    pickup.object3D = new THREE.Object3D()
    pickup.position.set(4, 0.4, 4)
    room.add(pickup)

    // Before any update tick: bobPhase=0 -> sin(0)=0, no bob yet.
    room.updateRenderPositions(1)
    expect(pickup.object3D.position.y).toBeCloseTo(0.4, 5)

    // Advance to a non-zero point on the sine — Y must depart from sim Y.
    for (let i = 0; i < 60; i++) room.update(1 / 60, {})
    room.updateRenderPositions(1)
    expect(pickup.object3D.position.y).not.toBeCloseTo(0.4, 3)
    // And the SIMULATION position must NOT move (gameplay unaffected).
    expect(pickup.position.y).toBe(0.4)
  })

  it('does not bob while carried (skipped by the entity loop)', () => {
    const room = new Room('test', 8, 8)
    const pickup = new Pickup('goblet')
    pickup.object3D = new THREE.Object3D()
    pickup.position.set(4, 0.4, 4)
    room.add(pickup)
    pickup.collect()

    for (let i = 0; i < 60; i++) room.update(1 / 60, {})
    room.updateRenderPositions(1)
    // No render-position update fired for an inactive entity — object3D
    // keeps the carry-local position the carrier sets it to.
    expect(pickup.object3D.position.y).toBe(0)
  })
})
