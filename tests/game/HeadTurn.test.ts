import { describe, it, expect } from 'vitest'
import { HeadTurn } from '../../src/game/HeadTurn'
import { runFrames } from './frames'

const always = (byte: number) => () => byte / 256

// The body's handler (0xCDDA): on a frame the random byte (0x5BA5) is below
// 2 he glances one way (body graphic 6 of the view), at 0xFE or above the
// other (7), and holds it eight frames more.
describe('HeadTurn', () => {
  it('looks ahead while the random byte is anything else', () => {
    const head = new HeadTurn(always(0x80))
    runFrames(head, 50)
    expect(head.glance).toBeNull()
  })

  it('glances the first way on a byte below 2, the other on one of 0xFE or more', () => {
    const first = new HeadTurn(always(1))
    runFrames(first, 1)
    expect(first.glance).toBe(0)
    const second = new HeadTurn(always(0xfe))
    runFrames(second, 1)
    expect(second.glance).toBe(1)
  })

  it('holds a glance eight frames more, then looks ahead again', () => {
    const bytes = [1, ...Array(20).fill(0x80)]
    let i = 0
    const head = new HeadTurn(() => bytes[i++]! / 256)
    runFrames(head, 9)
    expect(head.glance).toBe(0)
    runFrames(head, 1)
    expect(head.glance).toBeNull()
  })

  it('glances about once in 64 frames, eight seconds of the original', () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const head = new HeadTurn(random)
    let glances = 0
    let was: number | null = null
    for (let f = 0; f < 64_000; f++) {
      runFrames(head, 1)
      if (head.glance !== null && was === null) glances++
      was = head.glance
    }
    expect(glances).toBeGreaterThan(800)
    expect(glances).toBeLessThan(1100)
  })
})
