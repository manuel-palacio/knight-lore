// The original HUD's chunky 7x8 digits. Zero and three are copied from the
// reference frame; the rest are drawn in the same style.
export const GLYPH_WIDTH = 7
export const GLYPH_HEIGHT = 8

export const DIGIT_GLYPHS: Record<string, string[]> = {
  '0': ['..###..', '.#..##.', '##.#.##', '##.#.##', '##.#.##', '##.#.#.', '.##.#..', '..###..'],
  '1': ['...##..', '..###..', '.#.##..', '...##..', '...##..', '...##..', '...##..', '.######'],
  '2': ['..###..', '.#..##.', '....##.', '...##..', '..##...', '.##....', '##.....', '######.'],
  '3': ['..###..', '.#..##.', '....##.', '..####.', '....###', '#....##', '#....##', '######.'],
  '4': ['....##.', '...###.', '..#.##.', '.#..##.', '##..##.', '#######', '....##.', '....##.'],
  '5': ['######.', '##.....', '##.....', '#####..', '....##.', '.....##', '#....##', '.#####.'],
  '6': ['..###..', '.##..#.', '##.....', '#####..', '##..##.', '##...##', '##...##', '.#####.'],
  '7': ['#######', '#....##', '....##.', '...##..', '..##...', '..##...', '..##...', '..##...'],
  '8': ['..###..', '.#..##.', '##..##.', '.####..', '##..###', '##...##', '##...##', '.#####.'],
  '9': ['..###..', '.#..##.', '##...##', '##...##', '.######', '.....##', '#....##', '.#####.'],
}

export function drawDigits(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  let cx = x
  for (const ch of text) {
    const rows = DIGIT_GLYPHS[ch]
    if (rows) drawBitmap(ctx, rows, cx, y, color)
    cx += GLYPH_WIDTH + 1
  }
}

// Rows of '#' for a lit pixel, drawn a pixel each from the top left.
export function drawBitmap(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, color: string): void {
  ctx.fillStyle = color
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') ctx.fillRect(x + rx, y + ry, 1, 1)
  })
}
