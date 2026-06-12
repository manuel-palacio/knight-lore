import * as THREE from 'three'
import { KnightRig } from './KnightRig'
import { WerewolfRig } from './WerewolfRig'
import { CharacterAnimator } from './CharacterAnimator'
import { TransformSequence } from './TransformSequence'
import type { Form } from '../GameState'
import type { Rig } from './Rig'

export interface VisualInput {
  playerState: 'grounded' | 'airborne' | 'jumping'
  position: { x: number; z: number }
}

// Owns both puppet rigs and drives them from gameplay signals. Assigned as
// player.object3D — the renderer overwrites group.position every frame, so
// all animation offsets live on the rig roots (children), never the group.
export class CharacterVisual {
  readonly group = new THREE.Group()
  readonly animator = new CharacterAnimator()
  private readonly knight = new KnightRig()
  private readonly werewolf = new WerewolfRig()
  private form: Form = 'human'
  private sequence: TransformSequence | null = null
  private lastPosition: { x: number; z: number } | null = null

  constructor() {
    this.group.add(this.knight.root)
    this.group.add(this.werewolf.root)
    this.werewolf.root.visible = false
  }

  // Lags GameState.form until the flicker commits — visual state only.
  get currentForm(): Form {
    return this.form
  }

  startTransform(target: Form): void {
    if (this.sequence) this.sequence.restart(target)
    else this.sequence = new TransformSequence(target)
  }

  notifyLanded(): void {
    this.animator.notifyLanded()
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

    if (this.sequence) {
      const frame = this.sequence.update(dt)
      if (frame.done) {
        this.form = this.sequence.target
        this.sequence = null
      } else {
        const shown = frame.showTarget
          ? this.sequence.target
          : otherForm(this.sequence.target)
        this.setVisibleForm(shown)
        const rig = this.rigFor(shown)
        rig.applyPose(this.animator.pose(shown))
        rig.root.scale.x *= frame.jitterScale.x
        rig.root.scale.y *= frame.jitterScale.y
        rig.root.scale.z *= frame.jitterScale.z
        rig.root.rotation.z = frame.jitterTilt
        return
      }
    }

    this.setVisibleForm(this.form)
    this.rigFor(this.form).applyPose(this.animator.pose(this.form))
  }

  private rigFor(form: Form): Rig {
    return form === 'human' ? this.knight : this.werewolf
  }

  private setVisibleForm(form: Form): void {
    this.knight.root.visible = form === 'human'
    this.werewolf.root.visible = form === 'werewolf'
  }
}

function otherForm(form: Form): Form {
  return form === 'human' ? 'werewolf' : 'human'
}
