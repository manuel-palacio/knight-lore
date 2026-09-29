import { ALL_ITEMS } from '../game/GameState'
import { ROOM_SPECS } from '../scenes/rooms/roomSpecs'
import { BLOCK_GRAPHIC } from '../engine/IsoRenderer'

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load ${url}`))
    img.src = url
  })
}

// Recolour a sprite sheet to a flat tint (keeps alpha) so both forms read as one
// bright silhouette — the ZX monochrome character look, regardless of the
// source capture's colour (the wolf was extracted from a green recording).
export function tintImage(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const x = c.getContext('2d')
  if (!x) throw new Error('2D context unavailable')
  x.drawImage(img, 0, 0)
  // Multiply keeps the sprite's black interior (its mask) black and colours the lit pixels.
  x.globalCompositeOperation = 'multiply'
  x.fillStyle = color
  x.fillRect(0, 0, c.width, c.height)
  x.globalCompositeOperation = 'destination-in'
  x.drawImage(img, 0, 0)
  return c
}

// Everything in the play area is drawn in the room's one colour, as on the
// Spectrum; each sprite is tinted per room hue on first use.
export class Tints {
  private readonly byImage = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement>>()

  inHue(source: HTMLImageElement, hue: number): HTMLCanvasElement {
    let byHue = this.byImage.get(source)
    if (!byHue) this.byImage.set(source, (byHue = new Map()))
    let img = byHue.get(hue)
    if (!img) byHue.set(hue, (img = tintImage(source, `#${hue.toString(16).padStart(6, '0')}`)))
    return img
  }
}

export type Sprites = Awaited<ReturnType<typeof loadSprites>>

export async function loadSprites() {
  return {
    // The seizure's four poses, graphics 0x5C-0x5F.
    seizure: await loadImage('/sprites/sabreman-seizure.png'),
    strips: {
      human: {
        front: await loadImage('/sprites/sabreman-front.png'),
        back: await loadImage('/sprites/sabreman-back.png'),
      },
      werewolf: {
        front: await loadImage('/sprites/sabrewulf-front.png'),
        back: await loadImage('/sprites/sabrewulf-back.png'),
      },
    },
    spikes: await loadImage('/sprites/rip/spikes.png'),
    // Set pieces ripped from the original's memory (public/sprites/rip/index.json).
    setPieces: {
      cauldron: await loadImage('/sprites/rip/cauldron.png'),
      wizard: await loadImage('/sprites/wizard.png'),
      flame: await loadImage('/sprites/rip/flame.png'),
      stars: await loadImage('/sprites/rip/stars.png'),
      // The hunting sparkle cloud, graphics 0xA4-0xA7.
      sparkle: await loadImage('/sprites/rip/sparkle.png'),
    },
    monsters: {
      ghost: await loadImage('/sprites/rip/ghost.png'),
      grille: await loadImage('/sprites/rip/cage.png'),
      spikedBall: await loadImage('/sprites/rip/spiked-ball.png'),
      guardLeft: await loadImage('/sprites/rip/guard-left.png'),
      guardRight: await loadImage('/sprites/rip/guard-right.png'),
      ball: await loadImage('/sprites/rip/ball.png'),
      hedge: await loadImage('/sprites/rip/hedge.png'),
      gargoyle: await loadImage('/sprites/rip/gargoyle.png'),
      chest: await loadImage('/sprites/rip/chest.png'),
      table: await loadImage('/sprites/rip/table.png'),
    },
    hud: {
      frame: await loadImage('/sprites/hud-frame.png'),
      scroll: tintImage(await loadImage('/sprites/hud-scroll.png'), '#ff3030'),
      day: tintImage(await loadImage('/sprites/hud-day.png'), '#40ff40'),
      hero: tintImage(await loadImage('/sprites/hud-hero.png'), '#ffffff'),
    },
    items: await loadItemImages(),
    backdrop: await loadBackdropSprites(),
  }
}

async function loadItemImages(): Promise<Map<string, HTMLImageElement>> {
  const images = await Promise.all(ALL_ITEMS.map((id) => loadImage(`/sprites/items/${id}.png`)))
  return new Map(ALL_ITEMS.map((id, i) => [id, images[i]!]))
}

// Every wall, arch, gate and hedge graphic the castle's rooms use, and the
// block the columns are built of (tools/rip/objects.py).
async function loadBackdropSprites(): Promise<Map<number, HTMLImageElement>> {
  const graphics = [...new Set([BLOCK_GRAPHIC, ...ROOM_SPECS.flatMap((r) => (r.backdrop ?? []).map((p) => p.graphic))])]
  const images = await Promise.all(graphics.map((g) => loadImage(`/sprites/rip/backdrop/${g}.png`)))
  return new Map(graphics.map((g, i) => [g, images[i]!]))
}
