import type { Form } from '../GameState'

export const TRANSFORM_DURATION = 0.9
const FLIP_COUNT = 12
const JITTER_SCALE_MIN = 0.92
const JITTER_SCALE_RANGE = 0.18
const TILT_RANGE = 0.24

export interface TransformFrame {
  showTarget: boolean
  jitterScale: { x: number; y: number; z: number }
  jitterTilt: number
  done: boolean
}

const IDENTITY_FRAME: TransformFrame = Object.freeze({
  showTarget: true,
  jitterScale: Object.freeze({ x: 1, y: 1, z: 1 }),
  jitterTilt: 0,
  done: true,
})

export class TransformSequence {
  target: Form
  private elapsed = 0

  constructor(target: Form) {
    this.target = target
  }

  restart(target: Form): void {
    this.target = target
    this.elapsed = 0
  }

  update(dt: number): TransformFrame {
    this.elapsed += dt
    const t = this.elapsed / TRANSFORM_DURATION
    if (t >= 1) return IDENTITY_FRAME

    // t² schedule: flip index accelerates — slow flicker becoming a strobe
    const flip = Math.floor(t * t * FLIP_COUNT)
    const jitter = (n: number): number => JITTER_SCALE_MIN + pseudoRandom(flip * 7 + n) * JITTER_SCALE_RANGE
    return {
      showTarget: flip % 2 === 1,
      jitterScale: { x: jitter(1), y: jitter(2), z: jitter(3) },
      jitterTilt: (pseudoRandom(flip * 7 + 4) - 0.5) * TILT_RANGE,
      done: false,
    }
  }
}

// Deterministic hash, not Math.random(): same flip index → same jitter,
// which keeps the sequence unit-testable and replay-stable.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
