# Procedural Character Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the player's placeholder capsule with procedurally built knight and werewolf puppet rigs, code-driven walk/jump/idle animation, and the Knight Lore flash-transformation sequence.

**Architecture:** Each character is a `THREE.Group` joint hierarchy (puppet rig) built from authored geometry. A pure-logic `CharacterAnimator` computes additive joint rotations from player state; `CharacterVisual` owns both rigs, applies poses, and runs the transform flash sequence. Gameplay code (`Player.ts`, `GameState.ts`) is untouched — visuals derive everything from existing signals.

**Tech Stack:** Three.js 0.160, TypeScript, Vitest. Spec: `docs/superpowers/specs/2026-06-12-procedural-character-visuals-design.md`. Art constraints: `docs/ART_DIRECTION.md`, `docs/VISUAL_DO_NOTS.md` (the art docs win all conflicts).

**Key existing facts (read before coding):**
- `Player.state` is `'grounded' | 'airborne' | 'jumping'` (`src/game/Player.ts:23`). `PLAYER_SPEED = 4`.
- `Entity.updateRenderPosition()` overwrites `object3D.position` every render frame (`src/game/Entity.ts:27-32`). Therefore bob/squash/yaw must be applied to an *inner* node of the rig, never to the group assigned to `player.object3D`.
- `GameState.onTransformed` fires *after* `toggleForm()`, so `state.form` is already the NEW form inside the callback (`src/game/GameState.ts:34-45`).
- `GameState` exports `type Form = 'human' | 'werewolf'` (`src/game/GameState.ts:1`).
- `main.ts` passes `onLanded`/`onJumped` callbacks into `room.update` (`src/main.ts:62-67`), currently no-ops.
- `main.ts` attaches the carried goblet via `player.object3D.add(...)` at `(0, 1.2, 0)` (`src/main.ts:90-92`) — keep `player.object3D` a plain `Group` positioned at the feet so this keeps working.
- `makeToonMaterial` (`src/game/Materials.ts`) is the hero material — its gradient ramp was tuned so characters stay readable in the dim dungeon. Use it for all rig meshes.
- Tests live in `tests/game/*.test.ts`, vitest, style per `tests/game/Werewolf.test.ts`.

---

### Task 1: CharacterAnimator — state machine, phase, facing

**Files:**
- Create: `src/game/characters/CharacterAnimator.ts`
- Test: `tests/game/CharacterAnimator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/game/CharacterAnimator.test.ts
import { describe, it, expect } from 'vitest'
import { CharacterAnimator, lerpAngle } from '../../src/game/characters/CharacterAnimator'

const GROUNDED_STILL = { playerState: 'grounded' as const, moveX: 0, moveZ: 0, speed: 0 }
const GROUNDED_MOVING = { playerState: 'grounded' as const, moveX: 4, moveZ: 0, speed: 4 }

describe('CharacterAnimator state derivation', () => {
  it('is idle when grounded and not moving', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_STILL)
    expect(a.state).toBe('idle')
  })

  it('walks when grounded and moving', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    expect(a.state).toBe('walk')
  })

  it('maps jumping/airborne player states to jump/fall', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, { ...GROUNDED_STILL, playerState: 'jumping' })
    expect(a.state).toBe('jump')
    a.update(1 / 60, { ...GROUNDED_STILL, playerState: 'airborne' })
    expect(a.state).toBe('fall')
  })

  it('enters land on notifyLanded and recovers to idle after 0.2s', () => {
    const a = new CharacterAnimator()
    a.notifyLanded()
    a.update(1 / 60, GROUNDED_STILL)
    expect(a.state).toBe('land')
    for (let i = 0; i < 20; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.state).toBe('idle')
  })
})

describe('CharacterAnimator walk phase', () => {
  it('advances phase proportionally to speed', () => {
    const slow = new CharacterAnimator()
    const fast = new CharacterAnimator()
    for (let i = 0; i < 30; i++) {
      slow.update(1 / 60, { ...GROUNDED_MOVING, speed: 2 })
      fast.update(1 / 60, { ...GROUNDED_MOVING, speed: 4 })
    }
    expect(fast.phase).toBeCloseTo(slow.phase * 2, 5)
  })

  it('does not advance phase while idle', () => {
    const a = new CharacterAnimator()
    for (let i = 0; i < 30; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.phase).toBe(0)
  })
})

describe('CharacterAnimator facing', () => {
  it('converges toward the movement direction', () => {
    const a = new CharacterAnimator()
    // moving +X → atan2(4, 0) = π/2
    for (let i = 0; i < 120; i++) a.update(1 / 60, GROUNDED_MOVING)
    expect(a.facing).toBeCloseTo(Math.PI / 2, 1)
  })

  it('holds facing when movement stops', () => {
    const a = new CharacterAnimator()
    for (let i = 0; i < 120; i++) a.update(1 / 60, GROUNDED_MOVING)
    const held = a.facing
    for (let i = 0; i < 30; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.facing).toBe(held)
  })
})

describe('lerpAngle', () => {
  it('takes the shortest path across the ±π wrap', () => {
    const result = lerpAngle(3.0, -3.0, 1)
    // shortest distance from 3.0 to -3.0 is +0.283 (through π), not -6.0
    expect(Math.cos(result - -3.0)).toBeCloseTo(1, 5)
    expect(result).toBeGreaterThan(3.0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/game/CharacterAnimator.test.ts`
Expected: FAIL — cannot resolve `../../src/game/characters/CharacterAnimator`

- [ ] **Step 3: Implement the animator core (no pose() yet)**

```typescript
// src/game/characters/CharacterAnimator.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/game/CharacterAnimator.test.ts`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add tests/game/CharacterAnimator.test.ts src/game/characters/CharacterAnimator.ts
git commit -m "feat(characters): CharacterAnimator state machine, walk phase, facing lerp"
```

---

### Task 2: CharacterAnimator — pose output

**Files:**
- Modify: `src/game/characters/CharacterAnimator.ts` (replace the stub `pose()`)
- Test: `tests/game/CharacterAnimator.test.ts` (append)

- [ ] **Step 1: Append failing pose tests**

```typescript
// append to tests/game/CharacterAnimator.test.ts

describe('CharacterAnimator pose', () => {
  it('walk pose swings legs in opposition and changes with phase', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = Math.PI / 2 // peak of stride
    const peak = a.pose('human')
    expect(peak.joints.legL!.x).toBeGreaterThan(0)
    expect(peak.joints.legR!.x).toBeLessThan(0)
    expect(peak.joints.legL!.x).toBeCloseTo(-peak.joints.legR!.x, 5)
    a.phase = Math.PI * 1.5 // opposite stride
    const trough = a.pose('human')
    expect(trough.joints.legL!.x).toBeLessThan(0)
  })

  it('walk pose is periodic over 2π', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = 0.7
    const p1 = a.pose('human')
    a.phase = 0.7 + Math.PI * 2
    const p2 = a.pose('human')
    expect(p2.joints.legL!.x).toBeCloseTo(p1.joints.legL!.x, 5)
    expect(p2.rootBob).toBeCloseTo(p1.rootBob, 5)
  })

  it('walk changes body shape, not just legs (torso roll + bob)', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = Math.PI / 2
    const pose = a.pose('human')
    expect(pose.joints.torso!.z).not.toBe(0)
    expect(pose.rootBob).toBeGreaterThan(0)
  })

  it('werewolf walk has larger stride and lunge than human', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_MOVING)
    a.phase = Math.PI / 2
    const wolf = a.pose('werewolf')
    const human = a.pose('human')
    expect(Math.abs(wolf.joints.legL!.x)).toBeGreaterThan(Math.abs(human.joints.legL!.x))
    expect(wolf.joints.torso!.x).toBeGreaterThan(human.joints.torso!.x)
  })

  it('land squashes below 1 and recovers', () => {
    const a = new CharacterAnimator()
    a.notifyLanded()
    a.update(1 / 60, GROUNDED_STILL)
    expect(a.pose('human').squash).toBeLessThan(1)
    for (let i = 0; i < 20; i++) a.update(1 / 60, GROUNDED_STILL)
    expect(a.pose('human').squash).toBe(1)
  })

  it('jump stretches above 1', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, { ...GROUNDED_STILL, playerState: 'jumping' })
    expect(a.pose('human').squash).toBeGreaterThan(1)
  })

  it('human idle sag deepens over time (burden)', () => {
    // sag is driven by idleTime, sway by time — pin time so both samples
    // share the same sway phase and only the sag term differs
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_STILL)
    a.time = 1.0
    const early = a.pose('human').joints.torso!.x
    a.idleTime = 10
    a.time = 1.0
    const late = a.pose('human').joints.torso!.x
    expect(late).toBeGreaterThan(early)
  })

  it('idle differs between forms (werewolf is restless)', () => {
    const a = new CharacterAnimator()
    a.update(1 / 60, GROUNDED_STILL)
    a.time = 0.4
    const wolf = a.pose('werewolf')
    const human = a.pose('human')
    expect(wolf.joints.head!.y).not.toBeCloseTo(human.joints.head!.y, 3)
  })

  it('pose yaw equals current facing', () => {
    const a = new CharacterAnimator()
    for (let i = 0; i < 120; i++) a.update(1 / 60, GROUNDED_MOVING)
    expect(a.pose('human').yaw).toBe(a.facing)
  })
})
```

Note: `time` and `idleTime` are public on the animator precisely so tests can pin the sway phase while varying accumulated idle.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm vitest run tests/game/CharacterAnimator.test.ts`
Expected: FAIL — pose tests fail (stub returns empty joints); Task 1 tests still PASS

- [ ] **Step 3: Replace the stub pose() with the real implementation**

Replace the `pose()` method and add form parameters at module level:

```typescript
// add near the other module constants in CharacterAnimator.ts
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
```

```typescript
// replace the stub pose() method
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
```

Note the asymmetries are deliberate (art doc: "transform must feel uncanny", "no fully mirrored motion"): `armR` swings at 0.7×, jump legs tuck unevenly (0.5 vs 0.7).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/game/CharacterAnimator.test.ts`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add tests/game/CharacterAnimator.test.ts src/game/characters/CharacterAnimator.ts
git commit -m "feat(characters): per-form pose output — walk cycle, jump/land squash, burdened idle"
```

---

### Task 3: TransformSequence

**Files:**
- Create: `src/game/characters/TransformSequence.ts`
- Test: `tests/game/TransformSequence.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/game/TransformSequence.test.ts
import { describe, it, expect } from 'vitest'
import { TransformSequence, TRANSFORM_DURATION } from '../../src/game/characters/TransformSequence'

function runFlips(seq: TransformSequence, from: number, to: number, step = 1 / 120): number {
  // counts visibility flips in the window (from, to]; assumes seq starts at t=0
  let flips = 0
  let last: boolean | null = null
  let t = 0
  while (t < to) {
    const frame = seq.update(step)
    t += step
    if (t > from && last !== null && frame.showTarget !== last) flips++
    if (t > from) last = frame.showTarget
    else last = frame.showTarget
  }
  return flips
}

describe('TransformSequence', () => {
  it('lasts TRANSFORM_DURATION and then reports done', () => {
    const seq = new TransformSequence('werewolf')
    let frame = seq.update(TRANSFORM_DURATION - 0.05)
    expect(frame.done).toBe(false)
    frame = seq.update(0.1)
    expect(frame.done).toBe(true)
  })

  it('ends showing the target form', () => {
    const seq = new TransformSequence('werewolf')
    const frame = seq.update(TRANSFORM_DURATION + 0.01)
    expect(frame.showTarget).toBe(true)
    expect(frame.jitterScale.x).toBe(1)
    expect(frame.jitterTilt).toBe(0)
  })

  it('flickers faster toward the end (accelerating flips)', () => {
    const firstHalf = runFlips(new TransformSequence('werewolf'), 0, TRANSFORM_DURATION / 2)
    const secondHalf = runFlips(new TransformSequence('werewolf'), TRANSFORM_DURATION / 2, TRANSFORM_DURATION)
    expect(secondHalf).toBeGreaterThan(firstHalf)
  })

  it('applies asymmetric jitter while running', () => {
    const seq = new TransformSequence('werewolf')
    const frame = seq.update(0.3)
    const { x, y, z } = frame.jitterScale
    expect(x === y && y === z).toBe(false)
  })

  it('restart resets the clock and retargets', () => {
    const seq = new TransformSequence('werewolf')
    seq.update(0.8)
    seq.restart('human')
    expect(seq.target).toBe('human')
    const frame = seq.update(0.1)
    expect(frame.done).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/game/TransformSequence.test.ts`
Expected: FAIL — cannot resolve module

- [ ] **Step 3: Implement**

```typescript
// src/game/characters/TransformSequence.ts
import type { Form } from '../GameState'

export const TRANSFORM_DURATION = 0.9
const FLIP_COUNT = 12

export interface TransformFrame {
  showTarget: boolean
  jitterScale: { x: number; y: number; z: number }
  jitterTilt: number
  done: boolean
}

const IDENTITY_FRAME: TransformFrame = {
  showTarget: true,
  jitterScale: { x: 1, y: 1, z: 1 },
  jitterTilt: 0,
  done: true,
}

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
    const jitter = (n: number): number => 0.92 + pseudoRandom(flip * 7 + n) * 0.18
    return {
      showTarget: flip % 2 === 1,
      jitterScale: { x: jitter(1), y: jitter(2), z: jitter(3) },
      jitterTilt: (pseudoRandom(flip * 7 + 4) - 0.5) * 0.24,
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/game/TransformSequence.test.ts`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add tests/game/TransformSequence.test.ts src/game/characters/TransformSequence.ts
git commit -m "feat(characters): transform flash sequence — accelerating flicker with deterministic jitter"
```

---

### Task 4: Rig base class

**Files:**
- Create: `src/game/characters/Rig.ts`
- Test: `tests/game/CharacterRigs.test.ts` (first describe block only)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/game/CharacterRigs.test.ts
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Rig } from '../../src/game/characters/Rig'
import type { JointRotation, Pose } from '../../src/game/characters/CharacterAnimator'

class StubRig extends Rig {
  constructor() {
    super()
    const torso = new THREE.Group()
    torso.rotation.x = 0.21 // baked bind posture
    this.root.add(torso)
    this.registerJoint('torso', torso)
  }
}

// Pose.joints is a full Record<JointName, JointRotation> — build a complete
// neutral pose and mutate the joints under test.
function makePose(overrides: Partial<Omit<Pose, 'joints'>> = {}): Pose {
  const j = (): JointRotation => ({ x: 0, y: 0, z: 0 })
  return {
    joints: { torso: j(), head: j(), armL: j(), armR: j(), legL: j(), legR: j(), tail: j(), hat: j() },
    rootBob: 0,
    squash: 1,
    yaw: 0,
    ...overrides,
  }
}

describe('Rig.applyPose', () => {
  it('applies pose rotations additively on top of the bind pose', () => {
    const rig = new StubRig()
    const pose = makePose()
    pose.joints.torso.x = 0.1
    rig.applyPose(pose)
    expect(rig.joints.get('torso')!.rotation.x).toBeCloseTo(0.31, 5)
    // applying again must not accumulate
    rig.applyPose(pose)
    expect(rig.joints.get('torso')!.rotation.x).toBeCloseTo(0.31, 5)
  })

  it('ignores pose entries for joints the rig does not have', () => {
    const rig = new StubRig()
    const pose = makePose()
    pose.joints.tail.x = 1
    expect(() => rig.applyPose(pose)).not.toThrow()
  })

  it('applies yaw, bob and volume-preserving squash to the root', () => {
    const rig = new StubRig()
    rig.applyPose(makePose({ rootBob: 0.05, squash: 0.8, yaw: 1.2 }))
    expect(rig.root.rotation.y).toBe(1.2)
    expect(rig.root.position.y).toBe(0.05)
    expect(rig.root.scale.y).toBe(0.8)
    expect(rig.root.scale.x).toBeGreaterThan(1) // squash widens
  })

  it('clears jitter tilt on the next pose application', () => {
    const rig = new StubRig()
    rig.root.rotation.z = 0.2 // simulate transform jitter
    rig.applyPose(makePose())
    expect(rig.root.rotation.z).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/game/CharacterRigs.test.ts`
Expected: FAIL — cannot resolve `../../src/game/characters/Rig`

- [ ] **Step 3: Implement**

```typescript
// src/game/characters/Rig.ts
import * as THREE from 'three'
import type { JointName, JointRotation, Pose } from './CharacterAnimator'

// Puppet-rig base: a joint hierarchy of Groups. Poses are additive deltas
// over each joint's bind rotation, so authored posture (stoop, hunch)
// lives in the rig and animation lives in the animator.
export class Rig {
  readonly root = new THREE.Group()
  readonly joints = new Map<string, THREE.Object3D>()
  private bindRotations = new Map<string, THREE.Euler>()

  protected registerJoint(name: JointName, node: THREE.Object3D): void {
    this.joints.set(name, node)
    this.bindRotations.set(name, node.rotation.clone())
  }

  applyPose(pose: Pose): void {
    // iterate the pose (full record) and skip joints this rig doesn't have —
    // the knight has no tail, the werewolf no hat
    for (const [name, delta] of Object.entries(pose.joints) as [JointName, JointRotation][]) {
      const node = this.joints.get(name)
      if (!node) continue
      const bind = this.bindRotations.get(name)!
      node.rotation.set(bind.x + delta.x, bind.y + delta.y, bind.z + delta.z)
    }
    this.root.rotation.set(0, pose.yaw, 0)
    this.root.position.y = pose.rootBob
    const widen = 1 + (1 - pose.squash) * 0.5
    this.root.scale.set(widen, pose.squash, widen)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/game/CharacterRigs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/game/CharacterRigs.test.ts src/game/characters/Rig.ts
git commit -m "feat(characters): Rig base — additive poses over bind posture, root bob/squash/yaw"
```

---

### Task 5: KnightRig

**Files:**
- Create: `src/game/characters/KnightRig.ts`
- Test: `tests/game/CharacterRigs.test.ts` (append)

- [ ] **Step 1: Append failing tests**

```typescript
// append to tests/game/CharacterRigs.test.ts
import { KnightRig } from '../../src/game/characters/KnightRig'

const KNIGHT_JOINTS = ['torso', 'head', 'armL', 'armR', 'legL', 'legR', 'hat']

describe('KnightRig', () => {
  it('exposes the full joint contract', () => {
    const rig = new KnightRig()
    for (const name of KNIGHT_JOINTS) {
      expect(rig.joints.has(name), `missing joint ${name}`).toBe(true)
    }
  })

  it('stands roughly player-extents tall with origin at the feet', () => {
    const rig = new KnightRig()
    const box = new THREE.Box3().setFromObject(rig.root)
    expect(box.min.y).toBeGreaterThan(-0.15)
    expect(box.max.y).toBeGreaterThan(1.3)
    expect(box.max.y).toBeLessThan(2.0)
  })

  it('has an asymmetric silhouette (left/right bounding differs)', () => {
    // art doc: "fully mirrored silhouette left/right" is forbidden.
    // The satchel, shoulder and hat tilt must break symmetry measurably.
    const rig = new KnightRig()
    const box = new THREE.Box3().setFromObject(rig.root)
    expect(Math.abs(box.max.x) - Math.abs(box.min.x)).not.toBeCloseTo(0, 2)
  })
})
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run tests/game/CharacterRigs.test.ts`
Expected: FAIL — cannot resolve KnightRig; Rig tests still PASS

- [ ] **Step 3: Implement KnightRig**

```typescript
// src/game/characters/KnightRig.ts
import * as THREE from 'three'
import { Rig } from './Rig'
import { makeToonMaterial } from '../Materials'

const CLOAK = 0x554f6b
const HAT = 0x3a3550
const SKIN = 0xc9a884
const LEATHER = 0x2e2620
const SATCHEL = 0x6b4a2f

// Cursed, weary pilgrim-adventurer (ART_DIRECTION.md § Player — Human form):
// stooped, top-heavy travel cloak with a ragged hem, oversized drooping hat
// tilted to one side, satchel on the left hip. Origin at the feet.
export class KnightRig extends Rig {
  constructor() {
    super()
    const cloakMat = makeToonMaterial(CLOAK)
    cloakMat.side = THREE.DoubleSide
    const hatMat = makeToonMaterial(HAT)
    hatMat.side = THREE.DoubleSide
    const skinMat = makeToonMaterial(SKIN)
    const leatherMat = makeToonMaterial(LEATHER)
    const satchelMat = makeToonMaterial(SATCHEL)

    const pelvis = new THREE.Group()
    pelvis.position.y = 0.62
    this.root.add(pelvis)

    const legL = buildLeg(leatherMat)
    legL.position.set(0.16, 0, 0)
    pelvis.add(legL)
    this.registerJoint('legL', legL)

    const legR = buildLeg(leatherMat)
    legR.position.set(-0.16, 0, 0)
    pelvis.add(legR)
    this.registerJoint('legR', legR)

    const torso = new THREE.Group()
    torso.rotation.x = 0.21 // baked 12° stoop — weight of the curse
    pelvis.add(torso)
    this.registerJoint('torso', torso)

    const cloak = new THREE.Mesh(makeCloakGeometry(), cloakMat)
    cloak.castShadow = true
    torso.add(cloak)

    // one shoulder rides higher — burden carried on the left
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), cloakMat)
    shoulder.position.set(0.2, 0.78, 0)
    shoulder.castShadow = true
    torso.add(shoulder)

    const armL = buildArm(cloakMat, leatherMat)
    armL.position.set(0.4, 0.68, 0)
    armL.rotation.z = 0.25
    torso.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildArm(cloakMat, leatherMat)
    armR.position.set(-0.4, 0.72, 0)
    armR.rotation.z = -0.15 // asymmetric rest pose
    torso.add(armR)
    this.registerJoint('armR', armR)

    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.12), satchelMat)
    satchel.position.set(0.32, 0.12, 0.12)
    satchel.rotation.z = 0.2
    satchel.castShadow = true
    torso.add(satchel)

    const head = new THREE.Group()
    head.position.set(0, 0.86, 0.1) // juts forward from the shoulders
    torso.add(head)
    this.registerJoint('head', head)

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), skinMat)
    skull.scale.set(1, 1.15, 1.05)
    skull.castShadow = true
    head.add(skull)

    const hat = new THREE.Group()
    hat.position.y = 0.12
    hat.rotation.z = 0.16 // tilted — silhouette differs left vs right
    head.add(hat)
    this.registerJoint('hat', hat)

    const brim = new THREE.Mesh(makeBrimGeometry(), hatMat)
    brim.castShadow = true
    hat.add(brim)

    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 8), hatMat)
    crown.position.y = 0.14
    crown.rotation.z = -0.1 // crown slumps against the brim tilt
    crown.castShadow = true
    hat.add(crown)
  }
}

function buildLeg(mat: THREE.Material): THREE.Group {
  const leg = new THREE.Group()
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.5, 6), mat)
  shin.position.y = -0.3
  shin.castShadow = true
  leg.add(shin)
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.26), mat)
  boot.position.set(0, -0.56, 0.05)
  boot.castShadow = true
  leg.add(boot)
  return leg
}

function buildArm(sleeveMat: THREE.Material, gloveMat: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 6), sleeveMat)
  sleeve.position.y = -0.22
  sleeve.castShadow = true
  arm.add(sleeve)
  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), gloveMat)
  glove.position.y = -0.48
  glove.castShadow = true
  arm.add(glove)
  return arm
}

// Lathe profile bottom-up: ragged hem → waist → shoulder flare → neck.
// Hem vertices are jittered so the silhouette reads torn, not turned.
function makeCloakGeometry(): THREE.LatheGeometry {
  const points = [
    new THREE.Vector2(0.34, -0.55),
    new THREE.Vector2(0.3, -0.2),
    new THREE.Vector2(0.26, 0.2),
    new THREE.Vector2(0.34, 0.6),
    new THREE.Vector2(0.3, 0.74),
    new THREE.Vector2(0.1, 0.82),
  ]
  const geom = new THREE.LatheGeometry(points, 10)
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < -0.5) {
      const zig = i % 2 === 0 ? 0.06 : -0.04
      pos.setX(i, pos.getX(i) * (1 + zig))
      pos.setZ(i, pos.getZ(i) * (1 + zig))
      if (i % 3 === 0) pos.setY(i, pos.getY(i) + 0.08)
    }
  }
  geom.computeVertexNormals()
  return geom
}

// Wide pilgrim brim, drooping further on the +X side (one-sided sag).
function makeBrimGeometry(): THREE.LatheGeometry {
  const points = [
    new THREE.Vector2(0.08, 0.02),
    new THREE.Vector2(0.3, 0),
    new THREE.Vector2(0.42, -0.03),
  ]
  const geom = new THREE.LatheGeometry(points, 12)
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    if (x > 0.2) pos.setY(i, pos.getY(i) - (x - 0.2) * 0.45)
  }
  geom.computeVertexNormals()
  return geom
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/game/CharacterRigs.test.ts`
Expected: PASS. If the height assertion fails, adjust `pelvis.position.y` / cloak profile — do not loosen the test below 1.3.

- [ ] **Step 5: Commit**

```bash
git add tests/game/CharacterRigs.test.ts src/game/characters/KnightRig.ts
git commit -m "feat(characters): KnightRig — stooped pilgrim with drooping hat, ragged cloak, satchel"
```

---

### Task 6: WerewolfRig

**Files:**
- Create: `src/game/characters/WerewolfRig.ts`
- Test: `tests/game/CharacterRigs.test.ts` (append)

- [ ] **Step 1: Append failing tests**

```typescript
// append to tests/game/CharacterRigs.test.ts
import { WerewolfRig } from '../../src/game/characters/WerewolfRig'

const WEREWOLF_JOINTS = ['torso', 'head', 'armL', 'armR', 'legL', 'legR', 'tail']

describe('WerewolfRig', () => {
  it('exposes the full joint contract', () => {
    const rig = new WerewolfRig()
    for (const name of WEREWOLF_JOINTS) {
      expect(rig.joints.has(name), `missing joint ${name}`).toBe(true)
    }
  })

  it('is hunched: reads lower than the knight but deeper front-to-back', () => {
    const knight = new KnightRig()
    const wolf = new WerewolfRig()
    const kBox = new THREE.Box3().setFromObject(knight.root)
    const wBox = new THREE.Box3().setFromObject(wolf.root)
    expect(wBox.max.y).toBeLessThan(kBox.max.y)
    expect(wBox.max.z - wBox.min.z).toBeGreaterThan(kBox.max.z - kBox.min.z)
  })

  it('shares no geometry or material instances with the knight', () => {
    const knight = new KnightRig()
    const wolf = new WerewolfRig()
    const collect = (root: THREE.Object3D): Set<string> => {
      const uuids = new Set<string>()
      root.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          uuids.add(node.geometry.uuid)
          uuids.add((node.material as THREE.Material).uuid)
        }
      })
      return uuids
    }
    const kSet = collect(knight.root)
    for (const uuid of collect(wolf.root)) {
      expect(kSet.has(uuid)).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run tests/game/CharacterRigs.test.ts`
Expected: FAIL — cannot resolve WerewolfRig

- [ ] **Step 3: Implement WerewolfRig**

```typescript
// src/game/characters/WerewolfRig.ts
import * as THREE from 'three'
import { Rig } from './Rig'
import { makeToonMaterial } from '../Materials'

const FUR = 0x5a5046
const FUR_DARK = 0x423a32
const CLAW = 0xd8d0c0

// ART_DIRECTION.md § Player — Werewolf form: different mass distribution,
// not a furry human. Spine arcs 35° forward, shoulder hump dominates the
// silhouette, forearms reach near the ground, digitigrade haunches, tail
// completes the back arc. Origin at the feet.
export class WerewolfRig extends Rig {
  constructor() {
    super()
    const fur = makeToonMaterial(FUR)
    const furDark = makeToonMaterial(FUR_DARK)
    const claw = makeToonMaterial(CLAW)

    const hips = new THREE.Group()
    hips.position.y = 0.55
    this.root.add(hips)

    const legL = buildHaunch(furDark)
    legL.position.set(0.2, 0, -0.05)
    hips.add(legL)
    this.registerJoint('legL', legL)

    const legR = buildHaunch(furDark)
    legR.position.set(-0.2, 0, -0.05)
    hips.add(legR)
    this.registerJoint('legR', legR)

    const spine = new THREE.Group()
    spine.position.set(0, 0.12, 0)
    spine.rotation.x = 0.61 // baked 35° lunge — diagonal energy
    hips.add(spine)
    this.registerJoint('torso', spine)

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), fur)
    chest.scale.set(1.1, 1.0, 1.35)
    chest.position.set(0, 0.42, 0.05)
    chest.castShadow = true
    spine.add(chest)

    // the dominant silhouette mass, slightly off-axis
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), furDark)
    hump.scale.set(1.15, 0.85, 1.0)
    hump.position.set(0.05, 0.66, -0.08)
    hump.castShadow = true
    spine.add(hump)

    const armL = buildClawArm(fur, claw)
    armL.position.set(0.34, 0.5, 0.1)
    armL.rotation.set(-0.35, 0, 0.18)
    spine.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildClawArm(fur, claw)
    armR.position.set(-0.34, 0.5, 0.1)
    armR.rotation.set(-0.35, 0, -0.12) // asymmetric rest
    spine.add(armR)
    this.registerJoint('armR', armR)

    const head = new THREE.Group()
    head.position.set(0, 0.72, 0.28) // low and thrust forward
    spine.add(head)
    this.registerJoint('head', head)

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.22), fur)
    skull.castShadow = true
    head.add(skull)

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.3), furDark)
    snout.position.set(0, -0.03, 0.22)
    snout.castShadow = true
    head.add(snout)

    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), furDark)
    earL.position.set(0.09, 0.14, -0.05)
    earL.rotation.x = -0.9 // swept back
    head.add(earL)
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), furDark)
    earR.position.set(-0.09, 0.14, -0.05)
    earR.rotation.x = -1.05 // uneven sweep
    head.add(earR)

    const tail = new THREE.Group()
    tail.position.set(0, 0.05, -0.18)
    hips.add(tail)
    this.registerJoint('tail', tail)

    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.45, 6), furDark)
    tailMesh.rotation.x = Math.PI / 2 + 0.5 // points back and down
    tailMesh.position.set(0, -0.05, -0.2)
    tailMesh.castShadow = true
    tail.add(tailMesh)
  }
}

// Digitigrade haunch: baked two-segment bend (thigh forward, shin back).
function buildHaunch(mat: THREE.Material): THREE.Group {
  const haunch = new THREE.Group()
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.4, 6), mat)
  thigh.rotation.x = -0.55
  thigh.position.set(0, -0.16, 0.06)
  thigh.castShadow = true
  haunch.add(thigh)
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.35, 6), mat)
  shin.rotation.x = 0.6
  shin.position.set(0, -0.42, 0.02)
  shin.castShadow = true
  haunch.add(shin)
  const paw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.24), mat)
  paw.position.set(0, -0.52, 0.1)
  paw.castShadow = true
  haunch.add(paw)
  return haunch
}

// Long forearm flaring toward an oversized claw mass.
function buildClawArm(furMat: THREE.Material, clawMat: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 6), furMat)
  upper.position.y = -0.22
  upper.castShadow = true
  arm.add(upper)
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6), furMat)
  forearm.position.y = -0.65
  forearm.castShadow = true
  arm.add(forearm)
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.22), furMat)
  hand.position.y = -0.95
  hand.castShadow = true
  arm.add(hand)
  for (let i = 0; i < 3; i++) {
    const talon = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 4), clawMat)
    talon.position.set((i - 1) * 0.06, -1.0, 0.12)
    talon.rotation.x = 1.3
    arm.add(talon)
  }
  return arm
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/game/CharacterRigs.test.ts`
Expected: PASS. The hunched test compares against KnightRig — if it fails, lower `hips.position.y` or the spine angle; do not weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add tests/game/CharacterRigs.test.ts src/game/characters/WerewolfRig.ts
git commit -m "feat(characters): WerewolfRig — hunched lunge, shoulder hump, claw forearms, haunches"
```

---

### Task 7: CharacterVisual

**Files:**
- Create: `src/game/characters/CharacterVisual.ts`
- Test: `tests/game/CharacterVisual.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/game/CharacterVisual.test.ts
import { describe, it, expect } from 'vitest'
import { CharacterVisual } from '../../src/game/characters/CharacterVisual'
import { TRANSFORM_DURATION } from '../../src/game/characters/TransformSequence'

const STILL = { playerState: 'grounded' as const, position: { x: 3, z: 7 } }

function step(visual: CharacterVisual, seconds: number, input = STILL): void {
  const dt = 1 / 60
  for (let t = 0; t < seconds; t += dt) visual.update(dt, input)
}

describe('CharacterVisual', () => {
  it('starts as the human form with only the knight visible', () => {
    const v = new CharacterVisual()
    expect(v.currentForm).toBe('human')
    const [knightRoot, werewolfRoot] = v.group.children
    expect(knightRoot!.visible).toBe(true)
    expect(werewolfRoot!.visible).toBe(false)
  })

  it('completes a transform: form flips and only the target rig is visible', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    step(v, TRANSFORM_DURATION + 0.1)
    expect(v.currentForm).toBe('werewolf')
    const [knightRoot, werewolfRoot] = v.group.children
    expect(knightRoot!.visible).toBe(false)
    expect(werewolfRoot!.visible).toBe(true)
  })

  it('flickers both rigs during the sequence', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    let sawKnight = false
    let sawWerewolf = false
    const dt = 1 / 120
    for (let t = 0; t < TRANSFORM_DURATION - 0.05; t += dt) {
      v.update(dt, STILL)
      const [knightRoot, werewolfRoot] = v.group.children
      if (knightRoot!.visible) sawKnight = true
      if (werewolfRoot!.visible) sawWerewolf = true
    }
    expect(sawKnight).toBe(true)
    expect(sawWerewolf).toBe(true)
  })

  it('re-trigger mid-sequence restarts toward the new target', () => {
    const v = new CharacterVisual()
    v.startTransform('werewolf')
    step(v, 0.4)
    v.startTransform('human')
    step(v, TRANSFORM_DURATION + 0.1)
    expect(v.currentForm).toBe('human')
  })

  it('derives walk state from position deltas', () => {
    const v = new CharacterVisual()
    const dt = 1 / 60
    let x = 0
    for (let i = 0; i < 30; i++) {
      x += 4 * dt // moving at player speed
      v.update(dt, { playerState: 'grounded', position: { x, z: 0 } })
    }
    expect(v.animator.state).toBe('walk')
    v.update(dt, { playerState: 'grounded', position: { x, z: 0 } })
    expect(v.animator.state).toBe('idle')
  })

  it('applies the animator pose to the active rig (joints actually move)', () => {
    const v = new CharacterVisual()
    const dt = 1 / 60
    let x = 0
    let lastRotation: number | null = null
    let moved = false
    for (let i = 0; i < 30; i++) {
      x += 4 * dt
      v.update(dt, { playerState: 'grounded', position: { x, z: 0 } })
      const knightRoot = v.group.children[0]!
      const legL = knightRoot.getObjectByName('joint:legL')
      expect(legL).toBeDefined()
      if (lastRotation !== null && legL!.rotation.x !== lastRotation) moved = true
      lastRotation = legL!.rotation.x
    }
    expect(moved).toBe(true)
  })
})
```

Note: the last test requires joints to be findable by name. Add to `Rig.registerJoint`:

```typescript
  protected registerJoint(name: JointName, node: THREE.Object3D): void {
    node.name = `joint:${name}`
    this.joints.set(name, node)
    this.bindRotations.set(name, node.rotation.clone())
  }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/game/CharacterVisual.test.ts`
Expected: FAIL — cannot resolve module

- [ ] **Step 3: Implement CharacterVisual (and the Rig.registerJoint naming tweak above)**

```typescript
// src/game/characters/CharacterVisual.ts
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
  private lastX: number | null = null
  private lastZ = 0

  constructor() {
    this.group.add(this.knight.root)
    this.group.add(this.werewolf.root)
    this.werewolf.root.visible = false
  }

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
    const vx = this.lastX === null ? 0 : (input.position.x - this.lastX) / dt
    const vz = this.lastX === null ? 0 : (input.position.z - this.lastZ) / dt
    this.lastX = input.position.x
    this.lastZ = input.position.z
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
```

- [ ] **Step 4: Run the full suite**

Run: `pnpm test`
Expected: PASS (all files, including the pre-existing 31 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/game/CharacterVisual.test.ts src/game/characters/CharacterVisual.ts src/game/characters/Rig.ts
git commit -m "feat(characters): CharacterVisual — rig swap, velocity-derived animation, transform flicker"
```

---

### Task 8: Scene integration

**Files:**
- Modify: `src/scenes/TheHall.ts` (player block, lines ~149-163, plus `HallBuild` interface and imports)
- Modify: `src/main.ts` (onTransformed wiring ~line 40, onLanded ~line 65, per-frame visual update ~line 97)

- [ ] **Step 1: Replace the capsule in TheHall.ts**

Add the import:

```typescript
import { CharacterVisual } from '../game/characters/CharacterVisual'
```

Add `visual` to the build result interface:

```typescript
export interface HallBuild {
  room: Room
  player: Player
  visual: CharacterVisual
  enemy: PatrolEnemy
  door: Door
  goblet: Pickup
  burst: ParticleBurst
  torches: Torch[]
}
```

Replace the player spawn block (the capsule mesh construction through `room.setSpawn`):

```typescript
  // Player spawn at grid (1,3)
  const player = new Player()
  const visual = new CharacterVisual()
  player.object3D = visual.group
  player.position.set(1 * TILE + TILE / 2, 0, 3 * TILE + TILE / 2)
  player.renderPosition.copy(player.position)
  visual.group.position.copy(player.position)
  room.group.add(visual.group)
  room.add(player)
  room.setSpawn(player.position.x, player.position.z)
```

Update the return statement:

```typescript
  return { room, player, visual, enemy, door, goblet, burst, torches }
```

`makeToonMaterial` may become unused in TheHall.ts imports if the capsule was its only player use — it is still used by goblet/cauldron/enemy, so the import stays.

- [ ] **Step 2: Wire main.ts**

Destructure `visual` from the build (line ~33):

```typescript
  const { room, player, visual, enemy, door, goblet } = build
```

Extend the transform callback (replace the existing `state.onTransformed`):

```typescript
  state.onTransformed = () => {
    build.burst.burst(player.position)
    // onTransformed fires after toggleForm — state.form is already the target
    visual.startTransform(state.form)
  }
```

Wire landing (replace the `onLanded` no-op in `room.update`):

```typescript
    room.update(dt, {
      input,
      state,
      onLanded: () => visual.notifyLanded(),
      onJumped: () => {},
    })
```

Drive the visual each tick — add directly after the `state.tickTransform(dt)` line:

```typescript
    visual.update(dt, { playerState: player.state, position: player.position })
```

- [ ] **Step 3: Run the full verification suite**

Run: `pnpm test && pnpm lint && pnpm lint:no-render-pos && pnpm build`
Expected: tests PASS, lint clean, no-render-pos clean, tsc + vite build succeed

- [ ] **Step 4: Commit**

```bash
git add src/scenes/TheHall.ts src/main.ts
git commit -m "feat(scenes): replace player capsule with CharacterVisual knight/werewolf rigs"
```

---

### Task 9: Visual verification against the art docs

**Files:** none (browser verification; fixes loop back into the rig/animator files)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev` (background). Open `http://localhost:5173` in the browser (chrome-devtools or playwright MCP tools).

- [ ] **Step 2: Capture the checklist screenshots**

1. **Idle knight** — screenshot after ~3s standing still. Check: stooped, hat brim reads, asymmetric (satchel/shoulder), NOT an upright mannequin.
2. **Walking knight** — hold an arrow key, screenshot mid-stride. Check: torso roll + bob visible, not just leg alternation.
3. **Jump + land** — press Space, screenshot. Check: squash on landing reads as heavy.
4. **Transformation** — wait for the 20s timer (`HUMAN_DURATION`), screenshot during the flicker and after. Check: flash accelerates, jitter is uneven, ParticleBurst fires.
5. **Idle/walking werewolf** — screenshot both. Check: hunched, hump dominates, claws near ground, clearly NOT the knight's proportions.

- [ ] **Step 3: Audit against the docs**

Walk `docs/ART_DIRECTION.md` § Character Direction and § Animation Direction, and `docs/VISUAL_DO_NOTS.md` § Character Do Nots, item by item against the screenshots. The acid test from the spec: imagine both forms filled solid black — instantly distinguishable, knight not a generic hero.

- [ ] **Step 4: Fix what fails, re-run `pnpm test`, commit fixes**

```bash
git add -u
git commit -m "fix(characters): visual polish from art-direction audit"
```

---

## Acceptance mapping (spec → deliverable)

| Spec requirement | Delivered by | Proven by |
|---|---|---|
| Knight rig, required silhouette qualities | Task 5 `KnightRig.ts` | `CharacterRigs.test.ts` (joints, height, asymmetry) + Task 9 audit |
| Werewolf rig, different mass distribution | Task 6 `WerewolfRig.ts` | `CharacterRigs.test.ts` (hunched vs knight, no shared instances) + Task 9 audit |
| Pure testable animator | Tasks 1-2 `CharacterAnimator.ts` | `CharacterAnimator.test.ts` (state, phase, facing, pose) |
| Walk = shape change, jump compress/release, heavy landing | Task 2 pose() | pose tests (torso roll + bob, squash assertions) |
| Transform: flicker accelerates, asymmetric jitter, ends on target, re-trigger | Task 3 + Task 7 | `TransformSequence.test.ts`, `CharacterVisual.test.ts` |
| Player keeps control during transform | Task 7 (visual-only sequence; Player untouched) | no gameplay files modified except wiring |
| Integration via existing signals only | Task 8 | `main.ts`/`TheHall.ts` diff limited to wiring; full suite green |
| Visual verification vs art docs | Task 9 | screenshot audit |
