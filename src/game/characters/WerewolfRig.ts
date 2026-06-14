import * as THREE from 'three'
import { Rig } from './Rig'
import { makeHeroMaterial } from '../Materials'

// Per both.png: BIPEDAL upright werewolf, similar height to Sabreman.
// Pointed cat-like ears, short snout, arms held out at sides (slightly
// bent), tail trailing behind. Single bright tint (mono shader will pick
// the room's colour); we optimise for SHAPE over per-part colour.

const FUR = 0xf0d090
const FUR_DARK = 0xc89060
const CLAW = 0xfff0c0

export class WerewolfRig extends Rig {
  constructor() {
    super()
    const fur = makeHeroMaterial(FUR)
    const dark = makeHeroMaterial(FUR_DARK)
    const claw = makeHeroMaterial(CLAW, 1.2)

    // Pelvis — same height as the knight's so the figures match in scale
    const pelvis = new THREE.Group()
    pelvis.position.y = 0.36
    this.root.add(pelvis)

    const legL = buildBipedalLeg(fur, dark)
    legL.position.set(0.16, 0, 0)
    pelvis.add(legL)
    this.registerJoint('legL', legL)

    const legR = buildBipedalLeg(fur, dark)
    legR.position.set(-0.16, 0, 0)
    pelvis.add(legR)
    this.registerJoint('legR', legR)

    // Slight forward lean (predator posture, not a full hunch)
    const torso = new THREE.Group()
    torso.position.set(0, 0.08, 0)
    torso.rotation.x = 0.1
    pelvis.add(torso)
    this.registerJoint('torso', torso)

    // Body — wider barrel chest. One continuous mass, no hump.
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), fur)
    body.scale.set(1.1, 1.3, 1.0)
    body.position.y = 0.32
    body.castShadow = true
    torso.add(body)

    // Arms — held away from the body at the sides, slightly bent forward
    // (the "ready to strike" pose in both.png).
    const armL = buildArm(fur, claw)
    armL.position.set(0.32, 0.5, 0)
    armL.rotation.set(-0.15, 0, 0.35)
    torso.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildArm(fur, claw)
    armR.position.set(-0.32, 0.5, 0)
    armR.rotation.set(-0.2, 0, -0.3)
    torso.add(armR)
    this.registerJoint('armR', armR)

    // Head sits ON TOP of the torso (not pushed forward — bipedal)
    const head = new THREE.Group()
    head.position.set(0, 0.58, 0)
    torso.add(head)
    this.registerJoint('head', head)

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 9), fur)
    skull.scale.set(1.05, 1, 1.1)
    skull.castShadow = true
    head.add(skull)

    // Short snout poking forward
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.15), dark)
    snout.position.set(0, -0.04, 0.18)
    snout.castShadow = true
    head.add(snout)

    // Pointed cat-like ears on TOP of the head — the key silhouette feature
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), fur)
    earL.position.set(0.1, 0.18, -0.02)
    earL.rotation.z = -0.15
    earL.castShadow = true
    head.add(earL)
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), fur)
    earR.position.set(-0.1, 0.18, -0.02)
    earR.rotation.z = 0.15
    earR.castShadow = true
    head.add(earR)

    // Eye dots — bright accents that read as a menacing face
    const eyeMat = makeHeroMaterial(0x1a0e08, 0.4)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), eyeMat)
    eyeL.position.set(0.07, 0.04, 0.13)
    head.add(eyeL)
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), eyeMat)
    eyeR.position.set(-0.07, 0.04, 0.13)
    head.add(eyeR)

    // Tail — trails behind, hanging down
    const tail = new THREE.Group()
    tail.position.set(0, 0.15, -0.18)
    torso.add(tail)
    this.registerJoint('tail', tail)
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.35, 6), dark)
    tailMesh.rotation.x = Math.PI / 2 - 0.6
    tailMesh.position.set(0, -0.05, -0.16)
    tailMesh.castShadow = true
    tail.add(tailMesh)
  }
}

// Bipedal leg: cylinder thigh + box paw. Short and stocky like the knight's,
// so the two figures match in scale.
function buildBipedalLeg(fur: THREE.Material, dark: THREE.Material): THREE.Group {
  const leg = new THREE.Group()
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.28, 7), fur)
  thigh.position.y = -0.15
  thigh.castShadow = true
  leg.add(thigh)
  const paw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.24), dark)
  paw.position.set(0, -0.32, 0.04)
  paw.castShadow = true
  leg.add(paw)
  return leg
}

// Werewolf arm: sleeve + clawed hand. Held at the sides (rotation set by
// caller), shorter than the previous version's hanging-quadruped arm.
function buildArm(fur: THREE.Material, claw: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6), fur)
  upper.position.y = -0.15
  upper.castShadow = true
  arm.add(upper)
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.14), fur)
  hand.position.y = -0.32
  hand.castShadow = true
  arm.add(hand)
  // Three small talons sticking forward from the hand
  for (let i = 0; i < 3; i++) {
    const talon = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), claw)
    talon.position.set((i - 1) * 0.04, -0.4, 0.07)
    talon.rotation.x = 1.3
    talon.castShadow = true
    arm.add(talon)
  }
  return arm
}
