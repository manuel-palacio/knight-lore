import { describe, it, expect } from 'vitest'
import { Input, type GamepadSnapshot } from '../../src/engine/Input'

function pad(buttons: number[]): GamepadSnapshot {
  return { pressed: new Set(buttons) }
}

describe('Input with a gamepad', () => {
  it('maps the d-pad and face buttons onto the keyboard codes the game reads', () => {
    let held = pad([])
    const input = new Input(() => held)
    held = pad([12, 14])
    input.update()
    expect(input.isDown('ArrowUp')).toBe(true)
    expect(input.isDown('ArrowLeft')).toBe(true)
    expect(input.isDown('ArrowRight')).toBe(false)
  })

  it('reports a fresh button press once, like a key tap', () => {
    let held = pad([])
    const input = new Input(() => held)
    held = pad([0])
    input.update()
    expect(input.wasPressed('Space')).toBe(true)
    input.update()
    expect(input.wasPressed('Space')).toBe(false)
    expect(input.isDown('Space')).toBe(true)
    held = pad([])
    input.update()
    expect(input.isDown('Space')).toBe(false)
  })

  it('maps B to action and Start to pause', () => {
    let held = pad([])
    const input = new Input(() => held)
    held = pad([1, 9])
    input.update()
    expect(input.wasPressed('KeyE')).toBe(true)
    expect(input.wasPressed('KeyP')).toBe(true)
  })
})
