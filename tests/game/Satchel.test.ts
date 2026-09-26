import { describe, it, expect } from 'vitest'
import { Satchel, SATCHEL_SIZE } from '../../src/game/Satchel'

const charm = (id: string) => ({ id })

// The original's inventory: slots at 0x5BD8, a pick-up shifting them at 0xC141.
describe('Satchel', () => {
  it('carries three charms, as the original does', () => {
    expect(SATCHEL_SIZE).toBe(3)
    const satchel = new Satchel()
    for (const id of ['gem', 'boot', 'teacup']) expect(satchel.take(charm(id))).toBeUndefined()
    expect(satchel.ids).toEqual(['gem', 'boot', 'teacup'])
  })

  it('lets go of the charm carried longest to take a fourth', () => {
    const satchel = new Satchel()
    for (const id of ['gem', 'boot', 'teacup']) satchel.take(charm(id))
    expect(satchel.take(charm('poison'))?.id).toBe('gem')
    expect(satchel.ids).toEqual(['boot', 'teacup', 'poison'])
  })

  it('puts down the charm carried longest first', () => {
    const satchel = new Satchel()
    satchel.take(charm('gem'))
    satchel.take(charm('boot'))
    expect(satchel.putDownOldest()?.id).toBe('gem')
    expect(satchel.ids).toEqual(['boot'])
  })

  it('hands the cauldron the charm it wants from wherever it is carried', () => {
    const satchel = new Satchel()
    for (const id of ['gem', 'boot', 'teacup']) satchel.take(charm(id))
    expect(satchel.handOver('boot')?.id).toBe('boot')
    expect(satchel.handOver('goblet')).toBeUndefined()
    expect(satchel.ids).toEqual(['gem', 'teacup'])
  })
})
