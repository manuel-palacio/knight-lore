import * as THREE from 'three'
import { Rig } from './Rig'
import { makeHeroMaterial } from '../Materials'

const CLOAK = 0xb09a6e
const HAT = 0x96743e
const SKIN = 0xd8b58e
const LEATHER = 0x4a3a28
const SATCHEL = 0x7a5230
const TROUSER = 0x847055

// Cartoonish pilgrim-explorer in bright tan (player reference: the original
// Knight Lore sprite — upright, big round sun hat, reads instantly against
// the dark room). Slight lean + asymmetric details keep the cursed mood
// without tipping into hunchback. Origin at the feet.
export class KnightRig extends Rig {
  constructor() {
    super()
    const cloakMat = makeHeroMaterial(CLOAK)
    cloakMat.side = THREE.DoubleSide
    const hatMat = makeHeroMaterial(HAT)
    hatMat.side = THREE.DoubleSide
    const skinMat = makeHeroMaterial(SKIN)
    const leatherMat = makeHeroMaterial(LEATHER)
    const satchelMat = makeHeroMaterial(SATCHEL)

    // chibi proportions: short body, oversized head — cartoonish per the
    // original sprite, roughly three heads tall
    const pelvis = new THREE.Group()
    pelvis.position.y = 0.46
    this.root.add(pelvis)

    const trouserMat = makeHeroMaterial(TROUSER)

    const legL = buildLeg(trouserMat, leatherMat)
    legL.position.set(0.16, 0, 0)
    pelvis.add(legL)
    this.registerJoint('legL', legL)

    const legR = buildLeg(trouserMat, leatherMat)
    legR.position.set(-0.16, 0, 0)
    pelvis.add(legR)
    this.registerJoint('legR', legR)

    const torso = new THREE.Group()
    torso.rotation.x = 0.07 // gentle forward lean — weary, not hunchbacked
    pelvis.add(torso)
    this.registerJoint('torso', torso)

    const cloak = new THREE.Mesh(makeCloakGeometry(), cloakMat)
    cloak.castShadow = true
    torso.add(cloak)

    // one shoulder rides higher — burden carried on the left
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), cloakMat)
    shoulder.position.set(0.2, 0.56, 0)
    shoulder.castShadow = true
    torso.add(shoulder)

    const armL = buildArm(cloakMat, leatherMat)
    armL.position.set(0.36, 0.5, 0)
    armL.rotation.z = 0.25
    torso.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildArm(cloakMat, leatherMat)
    armR.position.set(-0.36, 0.54, 0)
    armR.rotation.z = -0.15 // asymmetric rest pose
    torso.add(armR)
    this.registerJoint('armR', armR)

    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.12), satchelMat)
    satchel.position.set(0.32, 0.12, 0.12)
    satchel.rotation.z = 0.2
    satchel.castShadow = true
    torso.add(satchel)

    const head = new THREE.Group()
    head.position.set(0, 0.74, 0.04)
    torso.add(head)
    this.registerJoint('head', head)

    // oversized cartoon head so the face reads from the isometric camera
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skinMat)
    skull.scale.set(1, 1.05, 1)
    skull.castShadow = true
    head.add(skull)

    // face — the original sprite's visible eyes and beard give it soul
    const eyeMat = makeHeroMaterial(0x2a2017)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.034, 6, 5), eyeMat)
    eyeL.position.set(0.08, 0.05, 0.205)
    head.add(eyeL)
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.034, 6, 5), eyeMat)
    eyeR.position.set(-0.08, 0.05, 0.205)
    head.add(eyeR)
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.08), satchelMat)
    beard.position.set(0, -0.1, 0.18)
    head.add(beard)

    const hat = new THREE.Group()
    hat.position.y = 0.19
    hat.rotation.z = 0.09 // slight tilt — silhouette differs left vs right
    head.add(hat)
    this.registerJoint('hat', hat)

    const brim = new THREE.Mesh(makeBrimGeometry(), hatMat)
    brim.castShadow = true
    hat.add(brim)

    // tall rounded explorer dome (pith-helmet read, not a rice hat)
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 7, 0, Math.PI * 2, 0, Math.PI / 2), hatMat)
    crown.scale.set(1, 1.15, 1)
    crown.position.y = 0.01
    crown.castShadow = true
    hat.add(crown)
  }
}

function buildLeg(trouserMat: THREE.Material, bootMat: THREE.Material): THREE.Group {
  const leg = new THREE.Group()
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.34, 6), trouserMat)
  shin.position.y = -0.21
  shin.castShadow = true
  leg.add(shin)
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.28), bootMat)
  boot.position.set(0, -0.4, 0.05)
  boot.castShadow = true
  leg.add(boot)
  return leg
}

function buildArm(sleeveMat: THREE.Material, gloveMat: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.34, 6), sleeveMat)
  sleeve.position.y = -0.17
  sleeve.castShadow = true
  arm.add(sleeve)
  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), gloveMat)
  glove.position.y = -0.38
  glove.castShadow = true
  arm.add(glove)
  return arm
}

// Lathe profile bottom-up: ragged hem → waist → shoulder flare → neck.
// Hem vertices are jittered so the silhouette reads torn, not turned.
function makeCloakGeometry(): THREE.LatheGeometry {
  const points = [
    new THREE.Vector2(0.3, -0.2),
    new THREE.Vector2(0.27, -0.02),
    new THREE.Vector2(0.26, 0.16),
    new THREE.Vector2(0.33, 0.46),
    new THREE.Vector2(0.28, 0.56),
    new THREE.Vector2(0.1, 0.62),
  ]
  const geom = new THREE.LatheGeometry(points, 10)
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < -0.14) {
      const segment = Math.floor(i / points.length) % 10
      const zig = segment % 2 === 0 ? 0.06 : -0.04
      pos.setX(i, pos.getX(i) * (1 + zig))
      pos.setZ(i, pos.getZ(i) * (1 + zig))
      if (segment % 3 === 0) pos.setY(i, pos.getY(i) + 0.08)
    }
  }
  geom.computeVertexNormals()
  return geom
}

// Compact explorer-hat brim, sagging gently on the +X side (one-sided droop).
function makeBrimGeometry(): THREE.LatheGeometry {
  const points = [
    new THREE.Vector2(0.08, 0.02),
    new THREE.Vector2(0.24, 0),
    new THREE.Vector2(0.33, -0.02),
  ]
  const geom = new THREE.LatheGeometry(points, 12)
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    if (x > 0.2) pos.setY(i, pos.getY(i) - (x - 0.2) * 0.2)
  }
  geom.computeVertexNormals()
  return geom
}
