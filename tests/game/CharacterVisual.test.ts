import { describe, it, expect } from 'vitest'
import { CharacterVisual } from '../../src/game/characters/CharacterVisual'
import { TRANSFORM_DURATION } from '../../src/game/characters/TransformSequence'

const STILL = { playerState: 'grounded' as const, position: { x: 3, z: 7 } }

function step(visual: CharacterVisual, seconds: number, input = STILL): void {
  const dt = 1 / 60
  for (let t = 0; t < seconds; t += dt) visual.update(dt, input)
}

describe('CharacterVisual', () => {
  it('starts as the human form with only the knight visible', () => {
    const v = new CharacterVisual()
    expect(v.currentForm).toBe('human')
    const [knightRoot, werewolfRoot] = v.group.children
    expect(knightRoot!.visible).toBe(true)
    expect(werewolfRoot!.visible).toBe(false)
  })

  it('completes a transform: form flips and only the target rig is visible', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    step(v, TRANSFORM_DURATION + 0.1)
    expect(v.currentForm).toBe('werewolf')
    const [knightRoot, werewolfRoot] = v.group.children
    expect(knightRoot!.visible).toBe(false)
    expect(werewolfRoot!.visible).toBe(true)
  })

  it('flickers both rigs during the sequence', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    let sawKnight = false
    let sawWerewolf = false
    const dt = 1 / 120
    for (let t = 0; t < TRANSFORM_DURATION - 0.05; t += dt) {
      v.update(dt, STILL)
      const [knightRoot, werewolfRoot] = v.group.children
      if (knightRoot!.visible) sawKnight = true
      if (werewolfRoot!.visible) sawWerewolf = true
    }
    expect(sawKnight).toBe(true)
    expect(sawWerewolf).toBe(true)
  })

  it('re-trigger mid-sequence restarts toward the new target', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    step(v, 0.4)
    v.startTransform('human')
    step(v, TRANSFORM_DURATION + 0.1)
    expect(v.currentForm).toBe('human')
  })

  it('derives walk state from position deltas', () => {
    const v = new CharacterVisual()
    const dt = 1 / 60
    let x = 0
    for (let i = 0; i < 30; i++) {
      x += 4 * dt // moving at player speed
      v.update(dt, { playerState: 'grounded', position: { x, z: 0 } })
    }
    expect(v.animator.state).toBe('walk')
    v.update(dt, { playerState: 'grounded', position: { x, z: 0 } })
    expect(v.animator.state).toBe('idle')
  })

  it('applies the animator pose to the active rig (joints actually move)', () => {
    const v = new CharacterVisual()
    const dt = 1 / 60
    let x = 0
    let lastRotation: number | null = null
    let moved = false
    for (let i = 0; i < 30; i++) {
      x += 4 * dt
      v.update(dt, { playerState: 'grounded', position: { x, z: 0 } })
      const knightRoot = v.group.children[0]!
      const legL = knightRoot.getObjectByName('joint:legL')
      expect(legL).toBeDefined()
      if (lastRotation !== null && legL!.rotation.x !== lastRotation) moved = true
      lastRotation = legL!.rotation.x
    }
    expect(moved).toBe(true)
  })
})
