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

  it('resets idleTime when the player leaves the ground', () => {
    const a = new CharacterAnimator()
    for (let i = 0; i < 60; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.idleTime).toBeGreaterThan(0)
    a.update(1 / 60, { ...GROUNDED_STILL, playerState: 'jumping' })
    expect(a.idleTime).toBe(0)
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

describe('CharacterAnimator pose', () => {
  it('walk pose swings legs in opposition and changes with phase', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = Math.PI / 2 // peak of stride
    const peak = a.pose('human')
    expect(peak.joints.legL!.x).toBeGreaterThan(0)
    expect(peak.joints.legR!.x).toBeLessThan(0)
    expect(peak.joints.legL!.x).toBeCloseTo(-peak.joints.legR!.x, 5)
    a.phase = Math.PI * 1.5 // opposite stride
    const trough = a.pose('human')
    expect(trough.joints.legL!.x).toBeLessThan(0)
  })

  it('walk pose is periodic over 2π', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = 0.7
    const p1 = a.pose('human')
    a.phase = 0.7 + Math.PI * 2
    const p2 = a.pose('human')
    expect(p2.joints.legL!.x).toBeCloseTo(p1.joints.legL!.x, 5)
    expect(p2.rootBob).toBeCloseTo(p1.rootBob, 5)
  })

  it('walk changes body shape, not just legs (torso roll + bob)', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = Math.PI / 2
    const pose = a.pose('human')
    expect(pose.joints.torso!.z).not.toBe(0)
    expect(pose.rootBob).toBeGreaterThan(0)
  })

  it('werewolf walk has larger stride and lunge than human', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = Math.PI / 2
    const wolf = a.pose('werewolf')
    const human = a.pose('human')
    expect(Math.abs(wolf.joints.legL!.x)).toBeGreaterThan(Math.abs(human.joints.legL!.x))
    expect(wolf.joints.torso!.x).toBeGreaterThan(human.joints.torso!.x)
  })

  it('land squashes below 1 and recovers', () => {
    const a = new CharacterAnimator()
    a.notifyLanded()
    a.update(1 / 60, GROUNDED_STILL)
    expect(a.pose('human').squash).toBeLessThan(1)
    for (let i = 0; i < 20; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.pose('human').squash).toBe(1)
  })

  it('jump stretches above 1', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, { ...GROUNDED_STILL, playerState: 'jumping' })
    expect(a.pose('human').squash).toBeGreaterThan(1)
  })

  it('human idle sag deepens over time (burden)', () => {
    // sag is driven by idleTime, sway by time — pin time so both samples
    // share the same sway phase and only the sag term differs
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_STILL)
    a.time = 1.0
    const early = a.pose('human').joints.torso!.x
    a.idleTime = 10
    a.time = 1.0
    const late = a.pose('human').joints.torso!.x
    expect(late).toBeGreaterThan(early)
  })

  it('idle differs between forms (werewolf is restless)', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_STILL)
    a.time = 0.4
    const wolf = a.pose('werewolf')
    const human = a.pose('human')
    expect(wolf.joints.head!.y).not.toBeCloseTo(human.joints.head!.y, 3)
  })

  it('pose yaw equals current facing', () => {
    const a = new CharacterAnimator()
    for (let i = 0; i < 120; i++) a.update(1 / 60, GROUNDED_MOVING)
    expect(a.pose('human').yaw).toBe(a.facing)
  })
})
