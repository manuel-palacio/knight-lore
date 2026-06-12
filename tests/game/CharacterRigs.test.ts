import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Rig } from '../../src/game/characters/Rig'
import type { JointRotation, Pose } from '../../src/game/characters/CharacterAnimator'
import { KnightRig } from '../../src/game/characters/KnightRig'
import { WerewolfRig } from '../../src/game/characters/WerewolfRig'

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
    // Dominated by the uneven arm rest poses (armL 0.25 vs armR -0.15);
    // satchel, raised shoulder and hat tilt add smaller breaks.
    const rig = new KnightRig()
    const box = new THREE.Box3().setFromObject(rig.root)
    expect(Math.abs(box.max.x) - Math.abs(box.min.x)).not.toBeCloseTo(0, 2)
  })

  it('cloak hem is ragged, not a smooth circle', () => {
    const rig = new KnightRig()
    const radii: number[] = []
    rig.root.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh || !(mesh.geometry instanceof THREE.LatheGeometry)) return
      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      // tunic hem ring sits at y = -0.2 (un-lifted vertices); the brim's
      // lowest vertices are well above this filter
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (y < -0.16) radii.push(Math.hypot(pos.getX(i), pos.getZ(i)))
      }
    })
    expect(radii.length).toBeGreaterThan(0)
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.02)
  })
})

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

  it('keeps its feet at the origin (nothing pokes through the floor)', () => {
    const wolf = new WerewolfRig()
    const box = new THREE.Box3().setFromObject(wolf.root)
    expect(box.min.y).toBeGreaterThan(-0.02)
  })

  it('shares no geometry or material instances with the knight', () => {
    const knight = new KnightRig()
    const wolf = new WerewolfRig()
    const collect = (root: THREE.Object3D): Set<string> => {
      const uuids = new Set<string>()
      root.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          uuids.add(node.geometry.uuid)
          const mats = Array.isArray(node.material) ? node.material : [node.material]
          for (const mat of mats) uuids.add(mat.uuid)
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
