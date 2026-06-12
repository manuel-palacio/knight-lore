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
    earL.castShadow = true
    head.add(earL)
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), furDark)
    earR.position.set(-0.09, 0.14, -0.05)
    earR.rotation.x = -1.05 // uneven sweep
    earR.castShadow = true
    head.add(earR)

    const tail = new THREE.Group()
    tail.position.set(0, 0.05, -0.18)
    hips.add(tail)
    this.registerJoint('tail', tail)

    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.45, 6), furDark)
    tailMesh.rotation.x = Math.PI / 2 - 0.5 // points back and down
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
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 6), mat)
  shin.rotation.x = 0.6
  shin.position.set(0, -0.38, 0.02)
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
    talon.castShadow = true
    arm.add(talon)
  }
  return arm
}
