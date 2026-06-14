import * as THREE from 'three'
import { Rig } from './Rig'
import { makeHeroMaterial } from '../Materials'

// Per sabreman.png reference: stocky chibi build, wide-brimmed pith helmet
// with a peaked finial, short stubby legs, satchel slung across the body.
// Single bright tint — under the mono shader everything reads as one
// silhouette anyway, so we optimise for SHAPE over part-by-part colour.

const BODY = 0xf0d090 // bright tan — pushes to top luminance band under mono
const ACCENT = 0xc89060 // mid-tan for hat brim / satchel — same hue, dimmer

export class KnightRig extends Rig {
  constructor() {
    super()
    const bodyMat = makeHeroMaterial(BODY)
    bodyMat.side = THREE.DoubleSide
    const accentMat = makeHeroMaterial(ACCENT)
    accentMat.side = THREE.DoubleSide

    // Pelvis — short legs (~1/3 of total height to match the chibi reference)
    const pelvis = new THREE.Group()
    pelvis.position.y = 0.34
    this.root.add(pelvis)

    const legL = buildStubbyLeg(bodyMat)
    legL.position.set(0.15, 0, 0)
    pelvis.add(legL)
    this.registerJoint('legL', legL)

    const legR = buildStubbyLeg(bodyMat)
    legR.position.set(-0.15, 0, 0)
    pelvis.add(legR)
    this.registerJoint('legR', legR)

    // Torso — wide, slightly forward-leaning. The reference Sabreman has
    // a near-square silhouette in the body.
    const torso = new THREE.Group()
    torso.rotation.x = 0.08
    pelvis.add(torso)
    this.registerJoint('torso', torso)

    const cloak = new THREE.Mesh(buildChunkyCloak(), bodyMat)
    cloak.castShadow = true
    torso.add(cloak)

    // Satchel hangs at the hip on the +X side — small dark accent box
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.1), accentMat)
    satchel.position.set(0.28, 0.05, 0.08)
    satchel.rotation.z = 0.15
    satchel.castShadow = true
    torso.add(satchel)

    const armL = buildArm(bodyMat)
    armL.position.set(0.3, 0.38, 0)
    armL.rotation.z = 0.2
    torso.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildArm(bodyMat)
    armR.position.set(-0.3, 0.4, 0)
    armR.rotation.z = -0.1
    torso.add(armR)
    this.registerJoint('armR', armR)

    // Head — small dome above the torso. Most of the visual real estate is
    // the hat sitting on top.
    const head = new THREE.Group()
    head.position.set(0, 0.58, 0.02)
    torso.add(head)
    this.registerJoint('head', head)

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bodyMat)
    skull.castShadow = true
    head.add(skull)

    // Tiny eye dots — they read as a face even at iso distance because
    // they're dark gaps in an otherwise bright silhouette.
    const eyeMat = makeHeroMaterial(0x1a0e08, 0.4)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), eyeMat)
    eyeL.position.set(0.06, 0.04, 0.15)
    head.add(eyeL)
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), eyeMat)
    eyeR.position.set(-0.06, 0.04, 0.15)
    head.add(eyeR)

    // Pith helmet: brim disc + rounded dome + peaked finial spike on top.
    // This is the silhouette feature that makes Sabreman recognisable —
    // every reference shows the wide brim + dome + peak combo.
    const hat = new THREE.Group()
    hat.position.y = 0.14
    head.add(hat)
    this.registerJoint('hat', hat)

    // Wide flat brim per both.png — almost a disc, sticks out past the head.
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16),
      accentMat,
    )
    brim.castShadow = true
    hat.add(brim)

    // Rounded dome on top, slightly squashed
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      bodyMat,
    )
    dome.scale.set(1, 0.9, 1)
    dome.position.y = 0.02
    dome.castShadow = true
    hat.add(dome)

    // Small peak on top of the dome (the pith-helmet finial)
    const finial = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.08, 8),
      accentMat,
    )
    finial.position.y = 0.22
    finial.castShadow = true
    hat.add(finial)
  }
}

// Stubby leg: cylinder thigh + box boot, very short.
function buildStubbyLeg(mat: THREE.Material): THREE.Group {
  const leg = new THREE.Group()
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.24, 7), mat)
  thigh.position.y = -0.14
  thigh.castShadow = true
  leg.add(thigh)
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.22), mat)
  boot.position.set(0, -0.3, 0.04)
  boot.castShadow = true
  leg.add(boot)
  return leg
}

// Arm: short cylinder sleeve + fist.
function buildArm(mat: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 6), mat)
  sleeve.position.y = -0.14
  sleeve.castShadow = true
  arm.add(sleeve)
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat)
  fist.position.y = -0.3
  fist.castShadow = true
  arm.add(fist)
  return arm
}

// Cloak: barrel-ish lathe with a flared base — wider than the previous
// slim explorer cloak. Stocky like the reference sprite. Hem segments
// jittered so the silhouette reads ragged-pixel, not turned-on-a-lathe.
function buildChunkyCloak(): THREE.LatheGeometry {
  const segments = 12
  const points = [
    new THREE.Vector2(0.36, -0.18), // wide hem
    new THREE.Vector2(0.34, 0.0),
    new THREE.Vector2(0.32, 0.2),
    new THREE.Vector2(0.34, 0.42),  // shoulders flare
    new THREE.Vector2(0.18, 0.5),   // neck
  ]
  const geom = new THREE.LatheGeometry(points, segments)
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < -0.16) {
      // Even/odd segment ring → in-out zigzag along the hem
      const segment = Math.floor(i / points.length) % segments
      const zig = segment % 2 === 0 ? 0.08 : -0.05
      pos.setX(i, pos.getX(i) * (1 + zig))
      pos.setZ(i, pos.getZ(i) * (1 + zig))
    }
  }
  geom.computeVertexNormals()
  return geom
}
