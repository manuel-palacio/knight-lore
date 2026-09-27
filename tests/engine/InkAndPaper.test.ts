import { describe, it, expect } from 'vitest'
import { snapToInkAndPaper } from '../../src/engine/InkAndPaper'

const GREEN = { r: 117, g: 251, b: 76 }
const pixels = (...rgb: [number, number, number][]) => new Uint8ClampedArray(rgb.flatMap(([r, g, b]) => [r, g, b, 255]))

// The Spectrum draws a room in one ink on black: every pixel one or the other.
describe('snapToInkAndPaper', () => {
  it("turns the room's shades and soft edges into its ink, and the dark outlines and black into black", () => {
    const data = pixels([117, 251, 76], [73, 156, 47], [47, 100, 30], [26, 55, 17], [60, 125, 38], [0, 0, 0])
    snapToInkAndPaper(data, GREEN)
    const out = [...data]
    const ink = [117, 251, 76, 255]
    const black = [0, 0, 0, 255]
    expect(out).toEqual([...ink, ...ink, ...ink, ...black, ...ink, ...black])
  })
})
