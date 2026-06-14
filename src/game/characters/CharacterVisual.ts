import * as THREE from 'three'
import { KnightRig } from './KnightRig'
import { WerewolfRig } from './WerewolfRig'
import { CharacterAnimator } from './CharacterAnimator'
import { TransformSequence, TRANSFORM_DURATION } from './TransformSequence'
import { PixelSprite } from '../PixelSprite'
import type { Form } from '../GameState'
import type { Rig } from './Rig'

export interface VisualInput {
  playerState: 'grounded' | 'airborne' | 'jumping'
  position: { x: number; z: number }
}

// Sprite sheets extracted from the original game running in the IA
// Spectrum emulator (see reference/extract-sprite.sh).
const TRANSFORM_STRIP_FRAMES = 30
const WEREWOLF_IDLE_FRAME = TRANSFORM_STRIP_FRAMES - 1
const HUMAN_WALK_FRAMES = 26
const WOLF_WALK_FRAMES = 46
const WALK_FPS = 8

// Owns the player's visuals — a pixel-art SPRITE for the on-screen body
// (sampled from the original Knight Lore transformation strip) plus the
// 3D rigs kept around as fallback/animator state. The renderer overwrites
// group.position every frame so animation offsets stay on the sprite,
// never the group.
export class CharacterVisual {
  readonly group = new THREE.Group()
  readonly animator = new CharacterAnimator()
  private readonly knight = new KnightRig()
  private readonly werewolf = new WerewolfRig()
  private readonly transformSprite: PixelSprite
  private readonly humanSprite: PixelSprite
  private readonly wolfSprite: PixelSprite
  private form: Form = 'human'
  private sequence: TransformSequence | null = null
  private lastPosition: { x: number; z: number } | null = null
  private transformElapsed = 0
  private walkPhase = 0

  constructor() {
    // 3D rigs kept around invisibly so animator state (joints, tests)
    // still has somewhere to apply. The PIXEL SPRITES are now the
    // visible character — extracted from the original ZX Spectrum game.
    this.group.scale.setScalar(2.2)
    this.group.add(this.knight.root)
    this.group.add(this.werewolf.root)
    this.knight.root.visible = false
    this.werewolf.root.visible = false

    this.humanSprite = new PixelSprite({
      url: '/sprites/sabreman-walk.png',
      frameCount: HUMAN_WALK_FRAMES,
      worldHeight: 1.6,
    })
    this.wolfSprite = new PixelSprite({
      url: '/sprites/sabrewulf-walk.png',
      frameCount: WOLF_WALK_FRAMES,
      worldHeight: 1.6,
    })
    this.transformSprite = new PixelSprite({
      url: '/sprites/transform-strip.png',
      frameCount: TRANSFORM_STRIP_FRAMES,
      worldHeight: 1.6,
    })
    this.humanSprite.sprite.visible = true
    this.wolfSprite.sprite.visible = false
    this.transformSprite.sprite.visible = false
    this.group.add(this.humanSprite.sprite)
    this.group.add(this.wolfSprite.sprite)
    this.group.add(this.transformSprite.sprite)
  }

  // Lags GameState.form until the flicker commits — visual state only.
  get currentForm(): Form {
    return this.form
  }

  startTransform(target: Form): void {
    if (this.sequence) this.sequence.restart(target)
    else this.sequence = new TransformSequence(target)
    this.transformElapsed = 0
  }

  notifyLanded(): void {
    this.animator.notifyLanded()
  }

  // Call after a teleport so the position jump doesn't read as velocity.
  resetMotion(): void {
    this.lastPosition = null
  }

  update(dt: number, input: VisualInput): void {
    if (dt <= 0) return
    const last = this.lastPosition
    const vx = last === null ? 0 : (input.position.x - last.x) / dt
    const vz = last === null ? 0 : (input.position.z - last.z) / dt
    this.lastPosition = { x: input.position.x, z: input.position.z }
    this.animator.update(dt, {
      playerState: input.playerState,
      moveX: vx,
      moveZ: vz,
      speed: Math.hypot(vx, vz),
    })

    // Transformation: play the morph strip; walking/idle: cycle the
    // form's walk strip indexed by movement velocity.
    if (this.sequence) {
      this.transformElapsed += dt
      const t = Math.min(1, this.transformElapsed / TRANSFORM_DURATION)
      const targetWolf = this.sequence.target === 'werewolf'
      const frameIdx = targetWolf
        ? t * WEREWOLF_IDLE_FRAME
        : WEREWOLF_IDLE_FRAME * (1 - t)
      this.transformSprite.setFrame(frameIdx)
      this.transformSprite.sprite.visible = true
      this.humanSprite.sprite.visible = false
      this.wolfSprite.sprite.visible = false
      if (t >= 1) {
        this.form = this.sequence.target
        this.sequence = null
      }
    } else {
      this.transformSprite.sprite.visible = false
      const isWolf = this.form === 'werewolf'
      this.humanSprite.sprite.visible = !isWolf
      this.wolfSprite.sprite.visible = isWolf
      // The original Knight Lore used the same sprite frame during
      // jumps — only Y position changed, no distinct airborne pose.
      // We freeze the walk phase mid-air; only walking-on-ground cycles.
      const moving = Math.hypot(vx, vz) > 0.1
      if (moving && input.playerState === 'grounded') {
        this.walkPhase += dt * WALK_FPS
      }
      const active = isWolf ? this.wolfSprite : this.humanSprite
      active.setFrame(Math.floor(this.walkPhase) % active.frameCount)
      this.rigFor(this.form).applyPose(this.animator.pose(this.form))
    }
  }

  private rigFor(form: Form): Rig {
    return form === 'human' ? this.knight : this.werewolf
  }
}
