import { describe, it, expect } from 'vitest'
import { CharacterVisual } from '../../src/game/characters/CharacterVisual'
import { TRANSFORM_DURATION } from '../../src/game/characters/TransformSequence'

const STILL = { playerState: 'grounded' as const, position: { x: 3, z: 7 } }

function step(visual: CharacterVisual, seconds: number, input = STILL): void {
  const dt = 1 / 60
  for (let t = 0; t < seconds; t += dt) visual.update(dt, input)
}

// Children added in CharacterVisual constructor:
// 0: knight rig (invisible)
// 1: werewolf rig (invisible)
// 2: humanSprite
// 3: wolfSprite
// 4: transformSprite
function parts(v: CharacterVisual) {
  const c = v.group.children
  return {
    knight: c[0]!,
    werewolf: c[1]!,
    humanSprite: c[2]!,
    wolfSprite: c[3]!,
    transformSprite: c[4]!,
  }
}

describe('CharacterVisual', () => {
  it('starts as human with the human sprite visible', () => {
    const v = new CharacterVisual()
    expect(v.currentForm).toBe('human')
    v.update(1 / 60, STILL)
    const p = parts(v)
    expect(p.humanSprite.visible).toBe(true)
    expect(p.wolfSprite.visible).toBe(false)
    expect(p.transformSprite.visible).toBe(false)
  })

  it('completes a transform: form flips to werewolf and the wolf sprite is the active visible one', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    step(v, TRANSFORM_DURATION + 0.1)
    expect(v.currentForm).toBe('werewolf')
    const p = parts(v)
    expect(p.humanSprite.visible).toBe(false)
    expect(p.wolfSprite.visible).toBe(true)
    expect(p.transformSprite.visible).toBe(false)
  })

  it('shows the transform sprite during the sequence', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    step(v, TRANSFORM_DURATION / 2)
    const p = parts(v)
    expect(p.transformSprite.visible).toBe(true)
    expect(p.humanSprite.visible).toBe(false)
    expect(p.wolfSprite.visible).toBe(false)
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

  it('applies the animator pose to the active rig (joints still move even though invisible)', () => {
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
