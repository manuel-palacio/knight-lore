// The Spectrum draws a room in one ink on black. Anything drawn in shades of
// the room's colour, or with soft edges, is set to the ink where it is at
// least this bright beside it, and to black where it is darker.
const INK_FROM = 0.3

export interface Rgb {
  r: number
  g: number
  b: number
}

export function snapToInkAndPaper(data: Uint8ClampedArray, ink: Rgb): void {
  const full = Math.max(ink.r, ink.g, ink.b)
  for (let i = 0; i < data.length; i += 4) {
    const lit = Math.max(data[i]!, data[i + 1]!, data[i + 2]!) >= full * INK_FROM
    data[i] = lit ? ink.r : 0
    data[i + 1] = lit ? ink.g : 0
    data[i + 2] = lit ? ink.b : 0
  }
}
