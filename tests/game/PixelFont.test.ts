import { describe, it, expect } from 'vitest'
import { DIGIT_GLYPHS, GLYPH_WIDTH, GLYPH_HEIGHT } from '../../src/game/PixelFont'

describe('PixelFont digits', () => {
  it('has ten glyphs of the original 7x8 size', () => {
    expect(Object.keys(DIGIT_GLYPHS)).toHaveLength(10)
    for (const rows of Object.values(DIGIT_GLYPHS)) {
      expect(rows).toHaveLength(GLYPH_HEIGHT)
      for (const row of rows) expect(row).toHaveLength(GLYPH_WIDTH)
    }
  })

  it('copies the zero and three exactly from the original HUD', () => {
    expect(DIGIT_GLYPHS['0']).toEqual(['..###..', '.#..##.', '##.#.##', '##.#.##', '##.#.##', '##.#.#.', '.##.#..', '..###..'])
    expect(DIGIT_GLYPHS['3']).toEqual(['..###..', '.#..##.', '....##.', '..####.', '....###', '#....##', '#....##', '######.'])
  })
})
