import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CharacterVisual } from '../../src/game/characters/CharacterVisual'
import { TRANSFORM_DURATION } from '../../src/game/characters/TransformSequence'

const STILL = { playerState: 'grounded' as const, position: { x: 3, z: 7 } }

function step(visual: CharacterVisual, seconds: number, input = STILL): void {
  const dt = 1 / 60
  for (let t = 0; t < seconds; t += dt) visual.update(dt, input)
}

function rigsAndSprite(v: CharacterVisual): { knight: THREE.Object3D; werewolf: THREE.Object3D; sprite: THREE.Object3D } {
  const children = v.group.children
  return {
    knight: children[0]!,
    werewolf: children[1]!,
    sprite: children[2]!,
  }
}

describe('CharacterVisual', () => {
  it('starts as human with the knight rig visible and sprite hidden', () => {
    const v = new CharacterVisual()
    expect(v.currentForm).toBe('human')
    const { knight, werewolf, sprite } = rigsAndSprite(v)
    // need one update tick to settle the initial visibility state
    v.update(1 / 60, STILL)
    expect(knight.visible).toBe(true)
    expect(werewolf.visible).toBe(false)
    expect(sprite.visible).toBe(false)
  })

  it('completes a transform: form flips, werewolf rig becomes the visible one', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    step(v, TRANSFORM_DURATION + 0.1)
    expect(v.currentForm).toBe('werewolf')
    const { knight, werewolf, sprite } = rigsAndSprite(v)
    expect(knight.visible).toBe(false)
    expect(werewolf.visible).toBe(true)
    expect(sprite.visible).toBe(false)
  })

  it('shows the pixel sprite during the transformation', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    // sample mid-sequence
    step(v, TRANSFORM_DURATION / 2)
    const { knight, werewolf, sprite } = rigsAndSprite(v)
    expect(sprite.visible).toBe(true)
    expect(knight.visible).toBe(false)
    expect(werewolf.visible).toBe(false)
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
      x += 4 * dt
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

  it('resetMotion prevents a teleport from reading as walk velocity', () => {
    const v = new CharacterVisual()
    const dt = 1 / 60
    v.update(dt, { playerState: 'grounded', position: { x: 0, z: 0 } })
    v.resetMotion()
    v.update(dt, { playerState: 'grounded', position: { x: 10, z: 10 } })
    expect(v.animator.state).toBe('idle')
  })
})
