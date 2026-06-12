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
    void form
    return { joints: {}, rootBob: 0, squash: 1, yaw: this.facing }
  }
}

export function lerpAngle(from: number, to: number, t: number): number {
  let delta = (to - from) % (Math.PI * 2)
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return from + delta * t
}
