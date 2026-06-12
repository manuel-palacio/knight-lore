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
