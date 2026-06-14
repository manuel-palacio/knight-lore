import * as THREE from 'three'
import { Rig } from './Rig'
import { makeHeroMaterial } from '../Materials'

// Sabrewulf per both.png / wulf.png / gif2-wulf transformation frames:
// bipedal upright wolf-creature, ~same height as Sabreman, single bright
// fill under the mono shader. Silhouette diagnostics that MUST survive:
//   - two LARGE pointed ears on top of the head (replace the hat brim role)
//   - long SNOUT clearly protruding forward
//   - tail trailing behind
//   - bent claw arms held out from the body
// No mannequin parts: the body is a single pear-shaped mass like the
// knight, just hunchier and broader. Different posture (lean), different
// silhouette terms (ears + snout vs hat brim), different rest pose.

const BODY = 0xf0d090
const ACCENT = 0x6a4a20

export class WerewolfRig extends Rig {
  constructor() {
    super()
    const bodyMat = makeHeroMaterial(BODY, 1.4)
    bodyMat.side = THREE.DoubleSide
    const darkMat = makeHeroMaterial(ACCENT, 0.5)
    darkMat.side = THREE.DoubleSide

    // PELVIS — same height as Sabreman so the two figures match in scale
    const pelvis = new THREE.Group()
    pelvis.position.y = 0.24
    this.root.add(pelvis)

    const legL = buildBipedalLeg(bodyMat, darkMat)
    legL.position.set(0.1, -0.04, 0)
    pelvis.add(legL)
    this.registerJoint('legL', legL)

    const legR = buildBipedalLeg(bodyMat, darkMat)
    legR.position.set(-0.1, -0.04, 0)
    pelvis.add(legR)
    this.registerJoint('legR', legR)

    // Torso: predator forward-lean, more aggressive than the knight's slouch.
    const torso = new THREE.Group()
    torso.rotation.x = 0.18
    pelvis.add(torso)
    this.registerJoint('torso', torso)

    // Body — broader/blockier than the knight pear. Hunched shoulders.
    const body = new THREE.Mesh(buildWolfBody(), bodyMat)
    body.castShadow = true
    torso.add(body)

    // Arms held WIDE — claws forward, ready to swipe (per the gif's pose
    // at the end of the transformation). Asymmetric rest pose.
    const armL = buildClawArm(bodyMat)
    armL.position.set(0.34, 0.42, 0.08)
    armL.rotation.set(-0.4, 0, 0.6)
    torso.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildClawArm(bodyMat)
    armR.position.set(-0.32, 0.44, 0.08)
    armR.rotation.set(-0.3, 0, -0.5)
    torso.add(armR)
    this.registerJoint('armR', armR)

    // HEAD — wolf skull with prominent snout. Pushed slightly forward.
    const head = new THREE.Group()
    head.position.set(0, 0.6, 0.06)
    torso.add(head)
    this.registerJoint('head', head)

    // Skull dome (rounded, like the knight head — silhouette swap is in
    // the ears + snout, not the skull shape).
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), bodyMat)
    skull.castShadow = true
    head.add(skull)

    // LONG SNOUT — clearly protrudes forward. Tapered cone, not a box.
    // This is the silhouette feature that says "wolf" at iso angle.
    const snout = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.32, 8),
      bodyMat,
    )
    snout.rotation.x = Math.PI / 2 // points along +z
    snout.position.set(0, -0.03, 0.32)
    snout.castShadow = true
    head.add(snout)

    // Black nose tip at the end of the snout
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      darkMat,
    )
    nose.position.set(0, -0.03, 0.46)
    head.add(nose)

    // BIG POINTED EARS — wider apart and TALLER than before so they
    // clearly stick out past the head silhouette in iso projection.
    // These replace the knight's hat brim as the "umbrella" feature.
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5), bodyMat)
    earL.position.set(0.18, 0.32, -0.05)
    earL.rotation.set(-0.2, 0, -0.25)
    earL.castShadow = true
    head.add(earL)
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5), bodyMat)
    earR.position.set(-0.18, 0.32, -0.05)
    earR.rotation.set(-0.2, 0, 0.25)
    earR.castShadow = true
    head.add(earR)

    // Eyes — small dark dots on either side of the snout
    const eyeMat = makeHeroMaterial(0x000000, 0.0)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), eyeMat)
    eyeL.position.set(0.1, 0.08, 0.22)
    head.add(eyeL)
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), eyeMat)
    eyeR.position.set(-0.1, 0.08, 0.22)
    head.add(eyeR)

    // TAIL — trails behind, hanging down. Bigger than before so it
    // shows in iso silhouette.
    const tail = new THREE.Group()
    tail.position.set(0, 0.18, -0.22)
    torso.add(tail)
    this.registerJoint('tail', tail)
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.025, 0.5, 6), bodyMat)
    tailMesh.rotation.x = Math.PI / 2 - 0.7
    tailMesh.position.set(0, -0.05, -0.22)
    tailMesh.castShadow = true
    tail.add(tailMesh)
  }
}

// Bipedal leg — short and stocky, matching the knight's stub proportions
// so the two characters read as the same scale.
function buildBipedalLeg(fur: THREE.Material, dark: THREE.Material): THREE.Group {
  const leg = new THREE.Group()
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 7), fur)
  thigh.position.y = -0.08
  thigh.castShadow = true
  leg.add(thigh)
  const paw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.24), dark)
  paw.position.set(0, -0.18, 0.04)
  paw.castShadow = true
  leg.add(paw)
  return leg
}

// Claw arm: short sleeve + fist with 3 small talons sticking forward.
function buildClawArm(fur: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.32, 6), fur)
  upper.position.y = -0.16
  upper.castShadow = true
  arm.add(upper)
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), fur)
  hand.position.y = -0.35
  hand.castShadow = true
  arm.add(hand)
  for (let i = 0; i < 3; i++) {
    const talon = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), fur)
    talon.position.set((i - 1) * 0.045, -0.42, 0.08)
    talon.rotation.x = 1.3
    talon.castShadow = true
    arm.add(talon)
  }
  return arm
}

// Wolf body: bulkier than the knight pear. Wide at the shoulders/chest,
// narrow at the waist, no flared cloak hem. Ragged hem jitter still
// applied so silhouette isn't lathe-smooth.
function buildWolfBody(): THREE.LatheGeometry {
  const segments = 12
  const points = [
    new THREE.Vector2(0.24, -0.1), // narrow base (paws below)
    new THREE.Vector2(0.27, 0.08),
    new THREE.Vector2(0.32, 0.26),  // hunched shoulders
    new THREE.Vector2(0.34, 0.4),
    new THREE.Vector2(0.18, 0.5),   // neck nip
  ]
  const geom = new THREE.LatheGeometry(points, segments)
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < -0.08) {
      const segment = Math.floor(i / points.length) % segments
      const zig = segment % 2 === 0 ? 0.05 : -0.03
      pos.setX(i, pos.getX(i) * (1 + zig))
      pos.setZ(i, pos.getZ(i) * (1 + zig))
    }
  }
  geom.computeVertexNormals()
  return geom
}
