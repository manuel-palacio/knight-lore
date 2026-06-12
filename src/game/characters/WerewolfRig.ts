import * as THREE from 'three'
import { Rig } from './Rig'
import { makeHeroMaterial } from '../Materials'

const FUR = 0x5a5046
const FUR_DARK = 0x423a32
const CLAW = 0xd8d0c0

// Cartoon werewolf — clean and appealing, not deformed: one continuous
// arched body mass (no bolted-on hump), wolf head clearly out front with
// snout, ears and eyes, long claw forearms, digitigrade haunches, tail.
// Different mass distribution from the knight per ART_DIRECTION.md.
// Origin at the feet.
export class WerewolfRig extends Rig {
  constructor() {
    super()
    const fur = makeHeroMaterial(FUR)
    const furDark = makeHeroMaterial(FUR_DARK)
    const claw = makeHeroMaterial(CLAW)

    const hips = new THREE.Group()
    hips.position.y = 0.45
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
    spine.position.set(0, 0.1, 0)
    spine.rotation.x = 0.38 // forward lean — predatory, not folded in half
    hips.add(spine)
    this.registerJoint('torso', spine)

    // one continuous body mass, broad at the shoulders, arched along the
    // spine — reads as a powerful wolf torso, not a body with a growth
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), fur)
    body.scale.set(1.05, 1.35, 1.1)
    body.position.set(0, 0.45, 0.02)
    body.castShadow = true
    spine.add(body)

    const armL = buildClawArm(fur, claw)
    armL.position.set(0.3, 0.42, 0.08)
    armL.rotation.set(-0.35, 0, 0.18)
    spine.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildClawArm(fur, claw)
    armR.position.set(-0.3, 0.42, 0.08)
    armR.rotation.set(-0.35, 0, -0.12) // asymmetric rest
    spine.add(armR)
    this.registerJoint('armR', armR)

    const head = new THREE.Group()
    head.position.set(0, 0.82, 0.28) // clearly in front of the body mass
    spine.add(head)
    this.registerJoint('head', head)

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.26), fur)
    skull.castShadow = true
    head.add(skull)

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.32), furDark)
    snout.position.set(0, -0.04, 0.26)
    snout.castShadow = true
    head.add(snout)

    // amber predator eyes — the face needs to read alive, not a fur block
    const eyeMat = makeHeroMaterial(0xd8b84a)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), eyeMat)
    eyeL.position.set(0.08, 0.06, 0.14)
    head.add(eyeL)
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), eyeMat)
    eyeR.position.set(-0.08, 0.06, 0.14)
    head.add(eyeR)

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
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.34, 6), mat)
  thigh.rotation.x = -0.55
  thigh.position.set(0, -0.12, 0.06)
  thigh.castShadow = true
  haunch.add(thigh)
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.26, 6), mat)
  shin.rotation.x = 0.6
  shin.position.set(0, -0.3, 0.02)
  shin.castShadow = true
  haunch.add(shin)
  const paw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.24), mat)
  paw.position.set(0, -0.41, 0.1)
  paw.castShadow = true
  haunch.add(paw)
  return haunch
}

// Long forearm flaring toward an oversized claw mass.
function buildClawArm(furMat: THREE.Material, clawMat: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.34, 6), furMat)
  upper.position.y = -0.17
  upper.castShadow = true
  arm.add(upper)
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.36, 6), furMat)
  forearm.position.y = -0.5
  forearm.castShadow = true
  arm.add(forearm)
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.22), furMat)
  hand.position.y = -0.72
  hand.castShadow = true
  arm.add(hand)
  for (let i = 0; i < 3; i++) {
    const talon = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 4), clawMat)
    talon.position.set((i - 1) * 0.06, -0.77, 0.12)
    talon.rotation.x = 1.3
    talon.castShadow = true
    arm.add(talon)
  }
  return arm
}
