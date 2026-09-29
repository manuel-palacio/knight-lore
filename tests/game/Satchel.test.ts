import { describe, it, expect } from 'vitest'
import { Satchel, SATCHEL_SIZE } from '../../src/game/Satchel'

const charm = (id: string) => ({ id })

// The original's inventory: slots 0x5BDC, 0x5BE0, 0x5BE4, shifted along at 0xC12B.
describe('Satchel', () => {
  it('carries three charms, as the original does, the newest in the first slot', () => {
    expect(SATCHEL_SIZE).toBe(3)
    const satchel = new Satchel()
    for (const id of ['gem', 'boot', 'teacup']) expect(satchel.take(charm(id))).toBeUndefined()
    expect(satchel.slotIds).toEqual(['teacup', 'boot', 'gem'])
  })

  it('lets go of the charm carried longest to take a fourth (0xC164)', () => {
    const satchel = new Satchel()
    for (const id of ['gem', 'boot', 'teacup']) satchel.take(charm(id))
    expect(satchel.take(charm('poison'))?.id).toBe('gem')
    expect(satchel.slotIds).toEqual(['poison', 'teacup', 'boot'])
  })

  it('puts down what is in the last slot; with it empty, only shifts the slots along (0xC0B2)', () => {
    const satchel = new Satchel()
    satchel.take(charm('gem'))
    expect(satchel.slotIds).toEqual(['gem', null, null])
    expect(satchel.putDown()).toBeUndefined()
    expect(satchel.slotIds).toEqual([null, 'gem', null])
    expect(satchel.putDown()).toBeUndefined()
    expect(satchel.slotIds).toEqual([null, null, 'gem'])
    expect(satchel.putDown()?.id).toBe('gem')
    expect(satchel.isEmpty).toBe(true)
  })

  it('with two carried, the older comes down on the second press, the newer on the third', () => {
    const satchel = new Satchel()
    satchel.take(charm('gem'))
    satchel.take(charm('boot'))
    expect([1, 2, 3, 4].map(() => satchel.putDown()?.id)).toEqual([undefined, 'gem', 'boot', undefined])
  })
})
