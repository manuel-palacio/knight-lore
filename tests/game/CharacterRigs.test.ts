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
    // neutral pose returns joint to its baked bind rotation
    rig.applyPose(makePose())
    expect(rig.joints.get('torso')!.rotation.x).toBeCloseTo(0.21, 5)
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

  it('narrows on stretch (squash > 1)', () => {
    const rig = new StubRig()
    rig.applyPose(makePose({ squash: 1.06 }))
    expect(rig.root.scale.x).toBeLessThan(1)
    expect(rig.root.scale.y).toBeCloseTo(1.06, 5)
  })

  it('clears jitter tilt on the next pose application', () => {
    const rig = new StubRig()
    rig.root.rotation.z = 0.2 // simulate transform jitter
    rig.applyPose(makePose())
    expect(rig.root.rotation.z).toBe(0)
  })
})
