// Text on the picture in the page's 8x8 font, a character cell a letter. The
// browser smooths what it writes, so each pixel is set lit or left alone.
export const CELL = 8
const FONT = `${CELL}px "Press Start 2P", monospace`
const LIT_FROM = 128

const written = new Map<string, HTMLCanvasElement>()

// The canvas draws text only in a font already loaded.
export function loadPixelFont(): Promise<unknown> {
  return document.fonts.load(FONT).catch(() => undefined)
}

export function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  const key = `${color} ${text}`
  let image = written.get(key)
  if (!image) written.set(key, (image = write(text, color)))
  ctx.drawImage(image, x, y)
}

function write(text: string, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = text.length * CELL
  canvas.height = CELL
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context unavailable')
  ctx.font = FONT
  ctx.textBaseline = 'top'
  ctx.fillStyle = color
  ctx.fillText(text, 0, 0)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = image.data[i]! >= LIT_FROM ? 255 : 0
  ctx.putImageData(image, 0, 0)
  return canvas
}
