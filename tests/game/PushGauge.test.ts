import { describe, it, expect } from 'vitest'
import { PushGauge } from '../../src/game/PushGauge'

describe('PushGauge', () => {
  it('needs sustained pressing before it lets the block move', () => {
    const gauge = new PushGauge(4)
    expect([gauge.press(), gauge.press(), gauge.press()]).toEqual([false, false, false])
    expect(gauge.press()).toBe(true)
  })

  it('moves the block again after another full charge', () => {
    const gauge = new PushGauge(2)
    expect([gauge.press(), gauge.press(), gauge.press(), gauge.press()]).toEqual([false, true, false, true])
  })

  it('loses its charge when the player stops pushing', () => {
    const gauge = new PushGauge(3)
    gauge.press()
    gauge.press()
    gauge.release()
    expect([gauge.press(), gauge.press(), gauge.press()]).toEqual([false, false, true])
  })
})
