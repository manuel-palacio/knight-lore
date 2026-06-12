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
