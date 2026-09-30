import { describe, it, expect } from 'vitest'
import { Palette } from '../../src/view/Palette'

const GREEN = 0x75fb4c
function memory() {
  const kept = new Map<string, string>()
  return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) }
}

describe('Palette', () => {
  it('draws everything in the room\'s one ink by default, as the original does', () => {
    const palette = new Palette(memory())
    expect(palette.mapColours).toBe(false)
    expect(['room', 'danger', 'light'].map((k) => palette.ink(k as never, GREEN))).toEqual([GREEN, GREEN, GREEN])
    expect(palette.inks(GREEN)).toEqual([GREEN])
  })

  it('with the map\'s colours, what hurts is red and what he takes is white; the room stays its colour', () => {
    const palette = new Palette(memory())
    palette.toggle()
    expect(palette.ink('room', GREEN)).toBe(GREEN)
    expect(palette.ink('danger', GREEN)).toBe(0xea3323)
    expect(palette.ink('light', GREEN)).toBe(0xffffff)
    expect(palette.inks(GREEN)).toHaveLength(3)
  })

  it('remembers the choice for the next visit', () => {
    const kept = memory()
    new Palette(kept).toggle()
    expect(new Palette(kept).mapColours).toBe(true)
  })

  it('still works where nothing can be remembered', () => {
    const palette = new Palette({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    palette.toggle()
    expect(palette.mapColours).toBe(true)
  })
})
