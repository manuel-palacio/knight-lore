import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CHARM_OVER_CAULDRON, Cauldron, charmOverCauldron } from '../../src/game/Cauldron'

describe('Cauldron', () => {
  it('is in range horizontally near the rim, out of range across the room', () => {
    const c = new Cauldron()
    c.position.set(8, 1, 8)
    expect(c.isInRange(new THREE.Vector3(8.8, 1, 8))).toBe(true)
    expect(c.isInRange(new THREE.Vector3(8, 0, 9.2))).toBe(true)
    expect(c.isInRange(new THREE.Vector3(2, 0, 2))).toBe(false)
  })

  it('out of range when far below/above (no delivering from under the platform)', () => {
    const c = new Cauldron()
    c.position.set(8, 1, 8)
    expect(c.isInRange(new THREE.Vector3(8, 4.5, 8))).toBe(false)
  })

  it('the charm it wants hangs over it, 32 pixels up, only while he is a man', () => {
    expect(charmOverCauldron('goblet', 'human')).toBe('goblet')
    expect(charmOverCauldron('goblet', 'werewolf')).toBeNull()
    expect(charmOverCauldron(null, 'human')).toBeNull()
    expect(CHARM_OVER_CAULDRON).toBeCloseTo(32 / 12)
  })
})
