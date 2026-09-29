import { spriteDynamic, type Dynamic, type SpriteDraw } from '../engine/IsoRenderer'
import { SEIZURE_BEAT } from '../engine/effects'
import { selectCharacterFrame, STRIP_CELLS, type CharacterForm, type CharacterFrame } from '../game/CharacterFrame'
import { HeadTurn } from '../game/HeadTurn'
import type { Player } from '../game/Player'
import type { Sparkle } from '../game/Sparkle'
import { DRAWN_LOWER } from './SceneDynamics'
import type { Sprites, Tints } from './Sprites'

// The seizure (0xC357): eight beats of four frames, each drawing one of the
// four poses (graphics 0x5C-0x5F) at random, never the one just drawn, the
// mirror turned each beat (0xC36C); then he is the other form (0xC377).
const SEIZURE_BEATS = 8
const SEIZURE_POSES = 4
const TRANSFORM_DURATION = SEIZURE_BEATS * SEIZURE_BEAT
const STAR_CELLS = 6

// How he is drawn: the form drawn lags the game's across the transformation,
// he glances aside now and then, and dying he is a cloud of stars.
export class CharacterLook {
  form: CharacterForm = 'human'
  private transformElapsed = TRANSFORM_DURATION
  private transformTarget: CharacterForm = 'human'
  private poses: number[] = []
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

  transformInto(form: CharacterForm, poses: number[]): void {
    this.transformElapsed = 0
    this.transformTarget = form
    this.poses = poses
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

  private transforming(player: Player, hue: number): SpriteDraw {
    const strip = this.sprites.seizure
    const beat = Math.min(SEIZURE_BEATS - 1, Math.floor(this.transformElapsed / SEIZURE_BEAT))
    const frameW = strip.width / SEIZURE_POSES
    const facingFlip = player.facing === 'north' || player.facing === 'east'
    const flip = facingFlip !== (beat % 2 === 1)
    return { ...at(player), image: this.tints.inHue(strip, hue), frameX: (this.poses[beat] ?? 0) * frameW, frameW, frameH: strip.height, flip, drop: DRAWN_LOWER.man }
  }
}

// The seizure's poses, one a beat, drawn and sounded (0xB472) alike: at
// random, but never the pose just drawn (0xC362: the same one is turned to
// its neighbour).
export function seizurePoses(random: () => number = Math.random): number[] {
  const poses: number[] = []
  for (let beat = 0; beat < SEIZURE_BEATS; beat++) {
    const pose = Math.floor(random() * SEIZURE_POSES)
    poses.push(pose === poses.at(-1) ? pose ^ 1 : pose)
  }
  return poses
}

function at(player: Player): { x: number; y: number; z: number; scale: number } {
  return { x: player.position.x, y: player.position.y, z: player.position.z, scale: 1 }
}
