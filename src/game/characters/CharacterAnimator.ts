import type { Form } from '../GameState'

export type AnimState = 'idle' | 'walk' | 'jump' | 'fall' | 'land'

export interface JointRotation {
  x: number
  y: number
  z: number
}

export interface Pose {
  joints: Record<string, JointRotation>
  rootBob: number
  squash: number
  yaw: number
}

export interface AnimatorInput {
  playerState: 'grounded' | 'airborne' | 'jumping'
  moveX: number
  moveZ: number
  speed: number
}

export const LAND_DURATION = 0.2
const STRIDE_FREQUENCY = 2.2
const FACING_RATE = 10
const MOVE_EPSILON = 0.01

interface FormParams {
  stride: number
  armSwing: number
  bob: number
  roll: number
  lunge: number
  idleFreq: number
  idleAmp: number
}

const PARAMS: Record<Form, FormParams> = {
  human: { stride: 0.55, armSwing: 0.35, bob: 0.05, roll: 0.07, lunge: 0.06, idleFreq: 1.6, idleAmp: 0.035 },
  werewolf: { stride: 0.85, armSwing: 0.55, bob: 0.1, roll: 0.13, lunge: 0.18, idleFreq: 6.5, idleAmp: 0.05 },
}

function zeroRotation(): JointRotation {
  return { x: 0, y: 0, z: 0 }
}

export class CharacterAnimator {
  state: AnimState = 'idle'
  time = 0
  phase = 0
  idleTime = 0
  facing = 0
  private landTimer = 0

  notifyLanded(): void {
    this.landTimer = LAND_DURATION
  }

  update(dt: number, input: AnimatorInput): void {
    this.time += dt
    if (this.landTimer > 0) this.landTimer -= dt

    if (input.playerState === 'jumping') {
      this.state = 'jump'
    } else if (input.playerState === 'airborne') {
      this.state = 'fall'
    } else if (this.landTimer > 0) {
      this.state = 'land'
    } else if (input.speed > MOVE_EPSILON) {
      this.state = 'walk'
    } else {
      this.state = 'idle'
    }

    if (this.state === 'walk') {
      this.phase += input.speed * STRIDE_FREQUENCY * dt
      this.idleTime = 0
    } else if (this.state === 'idle') {
      this.idleTime += dt
    } else if (this.state === 'jump' || this.state === 'fall') {
      this.idleTime = 0
    }

    if (input.speed > MOVE_EPSILON) {
      const target = Math.atan2(input.moveX, input.moveZ)
      this.facing = lerpAngle(this.facing, target, 1 - Math.exp(-FACING_RATE * dt))
    }
  }

  get landRecovery(): number {
    return Math.max(this.landTimer, 0) / LAND_DURATION
  }

  pose(form: Form): Pose {
    const p = PARAMS[form]
    const joints: Record<string, JointRotation> = {
      torso: zeroRotation(),
      head: zeroRotation(),
      armL: zeroRotation(),
      armR: zeroRotation(),
      legL: zeroRotation(),
      legR: zeroRotation(),
      tail: zeroRotation(),
      hat: zeroRotation(),
    }
    let rootBob = 0
    let squash = 1

    switch (this.state) {
      case 'idle': {
        const sway = Math.sin(this.time * p.idleFreq) * p.idleAmp
        const sag = form === 'human' ? Math.min(this.idleTime / 12, 1) * 0.08 : 0
        joints.torso!.x = sway + sag
        joints.head!.x = -sway * 0.6
        joints.armL!.x = sway * 0.4
        joints.armR!.x = -sway * 0.3
        if (form === 'werewolf') {
          joints.head!.y = Math.sin(this.time * 2.3) * 0.22
          joints.tail!.y = Math.sin(this.time * 4.1) * 0.3
        } else {
          joints.hat!.z = sway * 0.6
        }
        rootBob = Math.sin(this.time * p.idleFreq) * 0.012
        break
      }
      case 'walk': {
        const s = Math.sin(this.phase)
        joints.legL!.x = s * p.stride
        joints.legR!.x = -s * p.stride
        joints.armL!.x = -s * p.armSwing
        joints.armR!.x = s * p.armSwing * 0.7
        joints.torso!.z = s * p.roll
        joints.torso!.x = p.lunge
        joints.head!.z = -s * p.roll * 0.5
        if (form === 'werewolf') joints.tail!.y = s * 0.4
        rootBob = Math.abs(s) * p.bob
        break
      }
      case 'jump': {
        joints.armL!.x = -1.2
        joints.armR!.x = -1.0
        joints.legL!.x = 0.5
        joints.legR!.x = 0.7
        squash = 1.06
        break
      }
      case 'fall': {
        joints.armL!.x = -1.4
        joints.armR!.x = -1.3
        joints.legL!.x = 0.2
        joints.legR!.x = 0.35
        squash = 1.04
        break
      }
      case 'land': {
        const k = this.landRecovery
        squash = 1 - 0.22 * k
        joints.torso!.x = 0.3 * k
        joints.armL!.x = 0.5 * k
        joints.armR!.x = 0.4 * k
        break
      }
    }

    return { joints, rootBob, squash, yaw: this.facing }
  }
}

export function lerpAngle(from: number, to: number, t: number): number {
  let delta = (to - from) % (Math.PI * 2)
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return from + delta * t
}
