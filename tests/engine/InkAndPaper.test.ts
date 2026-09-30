import { describe, it, expect } from 'vitest'
import { snapToInkAndPaper, snapToInks } from '../../src/engine/InkAndPaper'

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

describe('snapToInks (the map colours)', () => {
  it('sets each lit pixel to the ink nearest its hue, and dark ones to black', () => {
    const RED = { r: 234, g: 51, b: 35 }
    const WHITE = { r: 255, g: 255, b: 255 }
    const data = pixels([117, 251, 76], [200, 40, 30], [250, 250, 250], [120, 26, 18], [20, 20, 20])
    snapToInks(data, [GREEN, RED, WHITE])
    expect([...data]).toEqual([117, 251, 76, 255, 234, 51, 35, 255, 255, 255, 255, 255, 234, 51, 35, 255, 0, 0, 0, 255])
  })
})
