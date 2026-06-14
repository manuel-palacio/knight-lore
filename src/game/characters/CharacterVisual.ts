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

// Transform-strip frame layout: 30 frames total. Frame 0 is human idle,
// frame 29 is werewolf idle, frames 1-28 are the morph.
const STRIP_FRAMES = 30
const HUMAN_IDLE_FRAME = 0
const WEREWOLF_IDLE_FRAME = STRIP_FRAMES - 1

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
  private readonly sprite: PixelSprite
  private form: Form = 'human'
  private sequence: TransformSequence | null = null
  private lastPosition: { x: number; z: number } | null = null
  private transformElapsed = 0

  constructor() {
    // 3D rigs are the DEFAULT view — they rotate with the player's facing
    // and animate walk cycles. The pixel sprite is reserved for the
    // transformation sequence, where the original sprite frames are the
    // best possible reference and rotation doesn't matter (player is
    // anchored mid-morph).
    this.group.scale.setScalar(2.2)
    this.group.add(this.knight.root)
    this.group.add(this.werewolf.root)
    this.werewolf.root.visible = false

    this.sprite = new PixelSprite({
      url: '/sprites/transform-strip.png',
      frameCount: STRIP_FRAMES,
      worldHeight: 1.8,
    })
    this.sprite.setFrame(HUMAN_IDLE_FRAME)
    this.sprite.sprite.visible = false
    this.group.add(this.sprite.sprite)
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

    // During the transformation, hide the 3D rigs and play the sprite
    // strip — this is where the original sprite art is unbeatable and
    // rotation doesn't matter (player is anchored mid-morph). Outside
    // the transform, the 3D rig (which CAN rotate / walk) is the visible
    // character.
    if (this.sequence) {
      this.transformElapsed += dt
      const t = Math.min(1, this.transformElapsed / TRANSFORM_DURATION)
      const targetWolf = this.sequence.target === 'werewolf'
      const frameIdx = targetWolf
        ? t * WEREWOLF_IDLE_FRAME
        : WEREWOLF_IDLE_FRAME * (1 - t)
      this.sprite.setFrame(frameIdx)
      this.sprite.sprite.visible = true
      this.knight.root.visible = false
      this.werewolf.root.visible = false
      if (t >= 1) {
        this.form = this.sequence.target
        this.sequence = null
      }
    } else {
      this.sprite.sprite.visible = false
      this.knight.root.visible = this.form === 'human'
      this.werewolf.root.visible = this.form === 'werewolf'
      this.rigFor(this.form).applyPose(this.animator.pose(this.form))
    }
  }

  private rigFor(form: Form): Rig {
    return form === 'human' ? this.knight : this.werewolf
  }
}
