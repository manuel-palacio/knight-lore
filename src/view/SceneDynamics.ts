import { spriteDynamic, blockColumnDynamic, BLOCK_GRAPHIC, type Dynamic } from '../engine/IsoRenderer'
import { projectToScreen, isoDepth } from '../engine/IsoProjection'
import { selectCharacterFrame } from '../game/CharacterFrame'
import { CHARM_OVER_CAULDRON, Cauldron } from '../game/Cauldron'
import { Pickup } from '../game/Pickup'
import { Spike } from '../game/SpikeGrid'
import { GhostEnemy } from '../game/GhostEnemy'
import { CauldronSpirit } from '../game/CauldronSpirit'
import { PathGuard } from '../game/PathGuard'
import { MovingPlatform } from '../game/MovingPlatform'
import { PushableBox } from '../game/PushableBox'
import { VanishingBlock } from '../game/VanishingBlock'
import { BouncingBall } from '../game/BouncingBall'
import { HoppingBall } from '../game/HoppingBall'
import { FallingBlock } from '../game/FallingBlock'
import { Wizard } from '../game/Wizard'
import { Portcullis } from '../game/Portcullis'
import { FloatingBlock } from '../game/FloatingBlock'
import { SpikedBall } from '../game/SpikedBall'
import { Flame, FLAME_FRAMES } from '../game/Flame'
import { SinkingCharm } from '../game/SinkingCharm'
import { Follower } from '../game/Follower'
import type { Entity } from '../game/Entity'
import type { Room } from '../game/Room'
import type { Sprites, Tints } from './Sprites'
import type { InkKind, Palette } from './Palette'

// How far below its place the original draws each sprite's bottom row, in
// pixels: the vertical offsets their handlers set (0xC4DD, 0xC4FC, 0xC4E3,
// 0xC4D8, 0xC4F2, 0xC506).
export const DRAWN_LOWER = { man: 6, wolf: 7, block: 8, charm: 4, ghost: 6, flame: 4, stars: 4, cauldron: 12 }
const GHOST_DRAW_HEIGHT = 0.3
// The hunting sparkle cloud's four graphics, a new one each frame (0xB98C).
const SPARKLE_FRAMES = 4
const SPARKLE_FRAME_MS = 50

// Draws everything in a room but him, in the room's hue, or in the map's
// colours (see Palette).
export class SceneDynamics {
  private readonly blockSprite: HTMLImageElement

  constructor(private readonly sprites: Sprites, private readonly tints: Tints, private readonly palette: Palette) {
    this.blockSprite = sprites.backdrop.get(BLOCK_GRAPHIC)!
  }

  // `charmShown` is the charm floating over the cauldron, if any.
  of(room: Room, charmShown: string | null): Dynamic[] {
    return [...this.decor(room), ...room.entities.flatMap((e) => this.entity(e, room, charmShown))]
  }

  // Hedges and gargoyles, in the room's hue like everything in it, each on
  // its level of a column (see IsoRenderer, which leaves those levels out).
  private decor(room: Room): Dynamic[] {
    return [...room.decor].map(([cell, kind]) => {
      const [gx, gz, level] = cell.split(',').map(Number) as [number, number, number]
      return stripFrame(this.monster(kind, room), 1, 0, (gx + 0.5) * room.tileSize, level, (gz + 0.5) * room.tileSize, false, DRAWN_LOWER.block)
    })
  }

  private entity(e: Entity, room: Room, charmShown: string | null): Dynamic[] {
    const hue = (image: HTMLImageElement, kind: InkKind = 'room') => this.tints.inHue(image, this.palette.ink(kind, room.tint))
    if (e instanceof Pickup) {
      const source = this.sprites.items.get(e.id)
      if (e.collected || !e.active || !source) return []
      return [stripFrame(hue(source, 'light'), 1, 0, e.position.x, e.position.y + e.bobOffset, e.position.z, false, DRAWN_LOWER.charm)]
    }
    if (e instanceof Cauldron) return this.cauldron(e, room, charmShown)
    if (e instanceof SinkingCharm) {
      const source = this.sprites.items.get(e.charm.id)
      return source ? [stripFrame(hue(source, 'light'), 1, 0, e.position.x, e.position.y, e.position.z, false, DRAWN_LOWER.charm)] : []
    }
    if (e instanceof Spike) return [spikeBedDynamic(hue(this.sprites.spikes), e.position.x, e.position.y, e.position.z)]
    if (e instanceof GhostEnemy) {
      return [stripFrame(this.monster('ghost', room, 'danger'), 4, Math.floor(performance.now() / 150) % 4, e.position.x, GHOST_DRAW_HEIGHT, e.position.z, false, DRAWN_LOWER.ghost)]
    }
    if (e instanceof CauldronSpirit || e instanceof Follower) {
      if (e instanceof CauldronSpirit && !e.risen) return []
      return [stripFrame(hue(this.sprites.setPieces.sparkle, 'danger'), SPARKLE_FRAMES, Math.floor(performance.now() / SPARKLE_FRAME_MS) % SPARKLE_FRAMES, e.position.x, e.position.y, e.position.z, false, DRAWN_LOWER.ghost)]
    }
    if (e instanceof PathGuard) {
      // Seen from the front or from behind over the man's legs, mirrored as he is.
      const look = selectCharacterFrame(e.facing, e.stepsTaken, true)
      return [stripFrame(this.monster(look.view === 'front' ? 'guardLeft' : 'guardRight', room, 'danger'), 4, e.stepsTaken % 4, e.position.x, 0, e.position.z, look.flip, DRAWN_LOWER.man)]
    }
    const block = this.tints.inHue(this.blockSprite, room.tint)
    if (e instanceof MovingPlatform) return [blockColumnDynamic(block, e.position.x, e.position.z, e.bottom, e.height)]
    if (e instanceof PushableBox) return [stripFrame(this.monster(e.kind, room), 1, 0, e.position.x, e.bottom, e.position.z, false, DRAWN_LOWER.block)]
    if (e instanceof VanishingBlock) return e.present ? [vanishingDynamic(e, block)] : []
    if (e instanceof BouncingBall) return [stripFrame(this.monster('ball', room, 'danger'), 2, e.position.y > 0.5 ? 1 : 0, e.position.x, e.position.y, e.position.z)]
    if (e instanceof HoppingBall) return [stripFrame(this.monster('ball', room, 'danger'), 2, e.speedPx > 0 ? 1 : 0, e.position.x, e.position.y, e.position.z)]
    if (e instanceof FallingBlock) return [blockColumnDynamic(block, e.position.x, e.position.z, e.top - 1, e.top)]
    if (e instanceof Wizard) return [stripFrame(hue(this.sprites.setPieces.wizard, 'danger'), 1, 0, e.position.x, 0, e.position.z)]
    if (e instanceof Portcullis) return this.portcullis(e, room)
    if (e instanceof FloatingBlock) {
      if (room.decorAt(Math.floor(e.position.x / room.tileSize), Math.floor(e.position.z / room.tileSize), e.bottom)) return []
      return [blockColumnDynamic(block, e.position.x, e.position.z, e.bottom, e.top)]
    }
    if (e instanceof SpikedBall) return [stripFrame(this.monster('spikedBall', room, 'danger'), 1, 0, e.position.x, e.position.y, e.position.z)]
    if (e instanceof Flame) return [stripFrame(hue(this.sprites.setPieces.flame, 'danger'), FLAME_FRAMES, e.frame, e.position.x, e.position.y, e.position.z, false, DRAWN_LOWER.flame)]
    return []
  }

  // Rests on a platform: lift to its real height and sort in front of it.
  private cauldron(e: Cauldron, room: Room, charmShown: string | null): Dynamic[] {
    const depth = isoDepth(e.position.x, e.position.y, e.position.z) + 6
    const light = this.palette.ink('light', room.tint)
    const pot = stripFrame(this.tints.inHue(this.sprites.setPieces.cauldron, light), 1, 0, e.position.x, e.position.y, e.position.z, false, DRAWN_LOWER.cauldron)
    const source = charmShown ? this.sprites.items.get(charmShown) : undefined
    if (!source) return [{ ...pot, depth }]
    const charm = stripFrame(this.tints.inHue(source, light), 1, 0, e.position.x, e.position.y + CHARM_OVER_CAULDRON, e.position.z, false, DRAWN_LOWER.charm)
    return [{ ...pot, depth }, { ...charm, depth: depth + 1 }]
  }

  // One grille per cell of its line, mirrored when the line runs north-south.
  private portcullis(e: Portcullis, room: Room): Dynamic[] {
    const acrossZ = e.cells[0]!.x === e.cells.at(-1)!.x && e.cells.length > 1
    const grille = this.monster('grille', room)
    return e.cells.map((c) => stripFrame(grille, 1, 0, c.x * room.tileSize + room.tileSize / 2, e.bottom, c.z * room.tileSize + room.tileSize / 2, acrossZ))
  }

  private monster(kind: keyof Sprites['monsters'], room: Room, ink: InkKind = 'room'): HTMLCanvasElement {
    return this.tints.inHue(this.sprites.monsters[kind], this.palette.ink(ink, room.tint))
  }
}

// Frame `frame` of a strip `cells` frames across.
export function stripFrame(image: HTMLCanvasElement, cells: number, frame: number, x: number, y: number, z: number, flip = false, drop = 0): Dynamic {
  const frameW = image.width / cells
  return spriteDynamic({ image, frameX: frame * frameW, frameW, frameH: image.height, scale: 1, flip, x, y, z, drop })
}

// Crumbling blocks flicker in their last steps before vanishing.
function vanishingDynamic(v: VanishingBlock, blockSprite: HTMLCanvasElement): Dynamic {
  const box = blockColumnDynamic(blockSprite, v.position.x, v.position.z, v.height - 1, v.height)
  const crumbling = v.framesUntilVanish >= 0
  if (!crumbling) return box
  return { ...box, draw: (ctx, cfg, shades) => { if (Math.floor(performance.now() / 80) % 2 === 0) box.draw(ctx, cfg, shades) } }
}

// The original's spike bed: a slab of teeth, anchored at the tile's near
// corner like a block top.
function spikeBedDynamic(spikes: HTMLCanvasElement, x: number, y: number, z: number): Dynamic {
  return {
    x,
    y,
    z,
    draw: (ctx, cfg) => {
      const p = projectToScreen(x, y, z + cfg.tile / 2, cfg)
      ctx.drawImage(spikes, Math.round(p.sx - spikes.width / 2), Math.round(p.sy - spikes.height))
    },
  }
}
