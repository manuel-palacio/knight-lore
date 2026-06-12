import { describe, it, expect } from 'vitest'
import { CharacterAnimator, lerpAngle } from '../../src/game/characters/CharacterAnimator'

const GROUNDED_STILL = { playerState: 'grounded' as const, moveX: 0, moveZ: 0, speed: 0 }
const GROUNDED_MOVING = { playerState: 'grounded' as const, moveX: 4, moveZ: 0, speed: 4 }

describe('CharacterAnimator state derivation', () => {
  it('is idle when grounded and not moving', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_STILL)
    expect(a.state).toBe('idle')
  })

  it('walks when grounded and moving', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    expect(a.state).toBe('walk')
  })

  it('maps jumping/airborne player states to jump/fall', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, { ...GROUNDED_STILL, playerState: 'jumping' })
    expect(a.state).toBe('jump')
    a.update(1 / 60, { ...GROUNDED_STILL, playerState: 'airborne' })
    expect(a.state).toBe('fall')
  })

  it('enters land on notifyLanded and recovers to idle after 0.2s', () => {
    const a = new CharacterAnimator()
    a.notifyLanded()
    a.update(1 / 60, GROUNDED_STILL)
    expect(a.state).toBe('land')
    for (let i = 0; i < 20; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.state).toBe('idle')
  })
})

describe('CharacterAnimator walk phase', () => {
  it('advances phase proportionally to speed', () => {
    const slow = new CharacterAnimator()
    const fast = new CharacterAnimator()
    for (let i = 0; i < 30; i++) {
      slow.update(1 / 60, { ...GROUNDED_MOVING, speed: 2 })
      fast.update(1 / 60, { ...GROUNDED_MOVING, speed: 4 })
    }
    expect(fast.phase).toBeCloseTo(slow.phase * 2, 5)
  })

  it('does not advance phase while idle', () => {
    const a = new CharacterAnimator()
    for (let i = 0; i < 30; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.phase).toBe(0)
  })
})

describe('CharacterAnimator facing', () => {
  it('converges toward the movement direction', () => {
    const a = new CharacterAnimator()
    // moving +X → atan2(4, 0) = π/2
    for (let i = 0; i < 120; i++) a.update(1 / 60, GROUNDED_MOVING)
    expect(a.facing).toBeCloseTo(Math.PI / 2, 1)
  })

  it('holds facing when movement stops', () => {
    const a = new CharacterAnimator()
    for (let i = 0; i < 120; i++) a.update(1 / 60, GROUNDED_MOVING)
    const held = a.facing
    for (let i = 0; i < 30; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.facing).toBe(held)
  })
})

describe('lerpAngle', () => {
  it('takes the shortest path across the ±π wrap', () => {
    const result = lerpAngle(3.0, -3.0, 1)
    // shortest distance from 3.0 to -3.0 is +0.283 (through π), not -6.0
    expect(Math.cos(result - -3.0)).toBeCloseTo(1, 5)
    expect(result).toBeGreaterThan(3.0)
  })
})
