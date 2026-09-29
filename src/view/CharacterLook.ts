import { spriteDynamic, type Dynamic, type SpriteDraw } from '../engine/IsoRenderer'
import { SEIZURE_BEAT } from '../engine/effects'
import { selectCharacterFrame, STRIP_CELLS, type CharacterForm, type CharacterFrame } from '../game/CharacterFrame'
import { HeadTurn } from '../game/HeadTurn'
import type { Player } from '../game/Player'
import type { Sparkle } from '../game/Sparkle'
import { DRAWN_LOWER } from './SceneDynamics'
import type { Sprites, Tints } from './Sprites'

// Character strips are native ZX resolution, 24x36 cells per pose, drawn at
// 1:1 canvas pixels so the sprite stays crisp. Cells per form: STRIP_CELLS.
const TRANSFORM_FRAMES = 11
const TRANSFORM_DURATION = 2.2 // 11 morph stages at the original's ~0.2s each
const STAR_CELLS = 6

// How he is drawn: the form drawn lags the game's across the transformation,
// he glances aside now and then, and dying he is a cloud of stars.
export class CharacterLook {
  form: CharacterForm = 'human'
  private transformElapsed = TRANSFORM_DURATION
  private transformTarget: CharacterForm = 'human'
  private moving = false
  private readonly headTurn = new HeadTurn()

  constructor(private readonly sprites: Sprites, private readonly tints: Tints) {}

  get morphing(): boolean {
    return this.transformElapsed < TRANSFORM_DURATION
  }

  // Drawn in this form from now on, with no transformation (a continued game).
  showAs(form: CharacterForm): void {
    this.form = this.transformTarget = form
  }

  transformInto(form: CharacterForm): void {
    this.transformElapsed = 0
    this.transformTarget = form
  }

  update(dt: number, walking: boolean): void {
    this.moving = walking
    this.headTurn.update()
    if (!this.morphing) return
    this.transformElapsed += dt
    if (!this.morphing) this.form = this.transformTarget
  }

  frame(player: Player): CharacterFrame {
    return selectCharacterFrame(player.facing, player.framesWalked, this.moving, player.state !== 'grounded', this.form, this.headTurn.glance)
  }

  dynamic(player: Player, sparkle: Sparkle, hue: number): Dynamic {
    if (sparkle.phase !== 'idle') return spriteDynamic(this.stars(player, sparkle, hue))
    if (this.morphing) return spriteDynamic(this.transforming(player, hue))
    const selected = this.frame(player)
    const sheet = this.tints.inHue(this.sprites.strips[this.form][selected.view], hue)
    const frameW = sheet.width / STRIP_CELLS[this.form]
    const drop = this.form === 'human' ? DRAWN_LOWER.man : DRAWN_LOWER.wolf
    return spriteDynamic({ ...at(player), image: sheet, frameX: selected.frame * frameW, frameW, frameH: sheet.height, flip: selected.flip, drop })
  }

  private stars(player: Player, sparkle: Sparkle, hue: number): SpriteDraw {
    const stars = this.tints.inHue(this.sprites.setPieces.stars, hue)
    const frameW = stars.width / STAR_CELLS
    return { ...at(player), image: stars, frameX: sparkle.starCell * frameW, frameW, frameH: stars.height, flip: false, drop: DRAWN_LOWER.stars }
  }

  // The morph strip was captured facing west; mirror it for the east-ish facings.
  private transforming(player: Player, hue: number): SpriteDraw {
    const strip = this.sprites.transform
    const progress = this.transformElapsed / TRANSFORM_DURATION
    const stage = Math.min(TRANSFORM_FRAMES - 1, Math.floor(progress * TRANSFORM_FRAMES))
    const frame = this.transformTarget === 'werewolf' ? stage : TRANSFORM_FRAMES - 1 - stage
    const frameW = strip.width / TRANSFORM_FRAMES
    const flip = player.facing === 'north' || player.facing === 'east'
    return { ...at(player), image: this.tints.inHue(strip, hue), frameX: frame * frameW, frameW, frameH: strip.height, flip, drop: DRAWN_LOWER.man }
  }
}

// The seizure's poses, one drawn at random on each fourth frame of it, as
// the original draws them (0xC357), for as long as the transformation lasts.
export function seizurePoses(): number[] {
  const beats = Math.ceil(TRANSFORM_DURATION / SEIZURE_BEAT)
  return Array.from({ length: beats }, () => Math.floor(Math.random() * 4))
}

function at(player: Player): { x: number; y: number; z: number; scale: number } {
  return { x: player.position.x, y: player.position.y, z: player.position.z, scale: 1 }
}
