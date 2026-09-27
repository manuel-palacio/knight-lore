import { describe, it, expect } from 'vitest'
import { TouchPad } from '../../src/engine/TouchPad'
import { Input } from '../../src/engine/Input'

const noPad = () => null

function setup() {
  const input = new Input(noPad)
  return { input, pad: new TouchPad(input) }
}

describe('TouchPad feeding Input', () => {
  it('a held button reads as a held key, and as one press', () => {
    const { input, pad } = setup()
    pad.touch(1, 'ArrowUp')
    input.update()
    expect(input.isDown('ArrowUp')).toBe(true)
    expect(input.wasPressed('ArrowUp')).toBe(true)
    input.update()
    expect(input.isDown('ArrowUp')).toBe(true)
    expect(input.wasPressed('ArrowUp')).toBe(false)
    pad.lift(1)
    expect(input.isDown('ArrowUp')).toBe(false)
  })

  it('two fingers hold two buttons at once: walking with Jump held', () => {
    const { input, pad } = setup()
    pad.touch(1, 'ArrowUp')
    pad.touch(2, 'Space')
    input.update()
    expect(input.isDown('ArrowUp') && input.isDown('Space')).toBe(true)
    pad.lift(2)
    expect(input.isDown('ArrowUp')).toBe(true)
    expect(input.isDown('Space')).toBe(false)
  })

  it('a thumb sliding across the d-pad lets go of one button and holds the next', () => {
    const { input, pad } = setup()
    pad.touch(1, 'ArrowUp')
    pad.touch(1, 'ArrowLeft')
    input.update()
    expect(input.isDown('ArrowUp')).toBe(false)
    expect(input.isDown('ArrowLeft')).toBe(true)
    expect(input.wasPressed('ArrowLeft')).toBe(true)
    pad.touch(1, undefined)
    expect(input.isDown('ArrowLeft')).toBe(false)
  })

  it('a cancelled touch lets go of its button', () => {
    const { input, pad } = setup()
    pad.touch(7, 'KeyE')
    pad.lift(7)
    expect(input.isDown('KeyE')).toBe(false)
  })

  it('a button held by two fingers stays held until both let go', () => {
    const { input, pad } = setup()
    pad.touch(1, 'Space')
    pad.touch(2, 'Space')
    pad.lift(1)
    expect(input.isDown('Space')).toBe(true)
    pad.lift(2)
    expect(input.isDown('Space')).toBe(false)
  })
})
