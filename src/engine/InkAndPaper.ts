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
  snapToInks(data, [ink])
}

// The same with more than one ink (the map's colours, see Palette): each pixel
// takes the ink nearest its hue, or black.
export function snapToInks(data: Uint8ClampedArray, inks: readonly Rgb[]): void {
  for (let i = 0; i < data.length; i += 4) {
    const pixel = { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! }
    const ink = nearestInk(pixel, inks)
    const lit = brightness(pixel) >= brightness(ink) * INK_FROM
    data[i] = lit ? ink.r : 0
    data[i + 1] = lit ? ink.g : 0
    data[i + 2] = lit ? ink.b : 0
  }
}

function nearestInk(pixel: Rgb, inks: readonly Rgb[]): Rgb {
  if (inks.length === 1) return inks[0]!
  const hue = normalised(pixel)
  let best = inks[0]!
  let bestDistance = Infinity
  for (const ink of inks) {
    const other = normalised(ink)
    const distance = (hue.r - other.r) ** 2 + (hue.g - other.g) ** 2 + (hue.b - other.b) ** 2
    if (distance < bestDistance) [best, bestDistance] = [ink, distance]
  }
  return best
}

function normalised(c: Rgb): Rgb {
  const top = brightness(c) || 1
  return { r: c.r / top, g: c.g / top, b: c.b / top }
}

function brightness(c: Rgb): number {
  return Math.max(c.r, c.g, c.b)
}
