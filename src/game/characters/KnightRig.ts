import * as THREE from 'three'
import { Rig } from './Rig'
import { makeHeroMaterial } from '../Materials'

// Sabreman, per sabreman.png + both.png and VISUAL_DO_NOTS.md.
//
// Avoiding the mannequin trap: no torso-rectangle + arm-rectangles + leg-
// rectangles + sphere-head construction. Instead, ONE big pear-shaped
// body/cloak does most of the work; tiny stub legs poke out from under;
// stub arms hang at the sides; oversized round head on top dominated by
// a HUGE wide-brim pith helmet with a peaked finial. Asymmetric: hat
// tilted, satchel slung +X side, one shoulder higher.
//
// True chibi proportions: roughly 2.2 heads tall (counting the hat).
// Tested against the reference: the hat is the biggest single silhouette
// element, the head is the second, and the body+legs are tertiary.

// Sabreman renders in a SINGLE bright fill — like the original ZX sprite.
// Internal definition comes from the silhouette + dark eye dots + the
// satchel/chin accents. No per-part value variation: that would just make
// the mono shader collapse to gray puddles.
const BODY = 0xf0d090
const ACCENT = 0x6a4a20

export class KnightRig extends Rig {
  constructor() {
    super()
    const bodyMat = makeHeroMaterial(BODY, 1.4)
    bodyMat.side = THREE.DoubleSide
    const hatMat = bodyMat // same fill as body — Sabreman is ONE colour
    const darkMat = makeHeroMaterial(ACCENT, 0.5)
    darkMat.side = THREE.DoubleSide

    // PELVIS — sits LOW so the head/hat (the silhouette stars) can be
    // huge without making the whole figure tower over the player extents.
    const pelvis = new THREE.Group()
    pelvis.position.y = 0.24
    this.root.add(pelvis)

    // TINY LEG STUBS — just enough to register as legs (and for the
    // animator to swing). Two short cylinders.
    const legL = buildStubLeg(bodyMat, darkMat)
    legL.position.set(0.1, -0.04, 0)
    pelvis.add(legL)
    this.registerJoint('legL', legL)

    const legR = buildStubLeg(bodyMat, darkMat)
    legR.position.set(-0.1, -0.04, 0)
    pelvis.add(legR)
    this.registerJoint('legR', legR)

    // TORSO joint — the single pear-shaped body hangs off this. Slight
    // forward lean per the reference's slouched pose.
    const torso = new THREE.Group()
    torso.rotation.x = 0.06
    pelvis.add(torso)
    this.registerJoint('torso', torso)

    // ONE pear-shaped body (not torso+arms+head boxes). Lathe profile
    // bottom→top: hem flare, waist, shoulder bulge, neck nip.
    const body = new THREE.Mesh(buildPearBody(), bodyMat)
    body.castShadow = true
    torso.add(body)

    // Asymmetric satchel slung +X — pushed PAST the brim radius (0.55)
    // so it extends the silhouette on the right side and breaks the
    // left/right mirror (forbidden by VISUAL_DO_NOTS).
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.12), darkMat)
    satchel.position.set(0.52, 0.18, 0.1)
    satchel.rotation.z = 0.25
    satchel.castShadow = true
    torso.add(satchel)

    // Stub arms — hang at sides, slightly bent. NOT articulated boxes;
    // just short capsules.
    // Asymmetric arm rest pose — left arm held further out than the right,
    // so the silhouette breaks left/right mirror (forbidden by VISUAL_DO_NOTS).
    const armL = buildStubArm(bodyMat)
    armL.position.set(0.3, 0.4, 0)
    armL.rotation.z = 0.7 // held out wide
    torso.add(armL)
    this.registerJoint('armL', armL)

    const armR = buildStubArm(bodyMat)
    armR.position.set(-0.27, 0.42, 0)
    armR.rotation.z = -0.15 // hangs closer to the body
    torso.add(armR)
    this.registerJoint('armR', armR)

    // HEAD — large round dome on top of the body. Sits high.
    const head = new THREE.Group()
    head.position.set(0, 0.62, 0.02)
    torso.add(head)
    this.registerJoint('head', head)

    // Big round face — chunky chibi head
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), bodyMat)
    skull.scale.set(1.05, 1, 1.05)
    skull.castShadow = true
    head.add(skull)

    // EYES — two dark dots that read at iso distance. Mandatory per the
    // VISUAL_DO_NOTS: "faceless head — eyes must read from the game
    // camera". Made bigger and pushed forward so they survive iso angle.
    const eyeMat = makeHeroMaterial(0x000000, 0.0) // pure black, no glow
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat)
    eyeL.position.set(0.09, 0.04, 0.2)
    head.add(eyeL)
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat)
    eyeR.position.set(-0.09, 0.04, 0.2)
    head.add(eyeR)

    // Beard / chin — small dark accent under the chin (the original
    // sprite has a clear beard/face shadow detail).
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.1), darkMat)
    chin.position.set(0, -0.13, 0.16)
    chin.castShadow = true
    head.add(chin)

    // HAT — the dominant silhouette element. Wide flat brim + low dome +
    // peaked finial. Tilted slightly for asymmetry.
    const hat = new THREE.Group()
    hat.position.y = 0.16
    hat.rotation.z = 0.08 // slight tilt — silhouette differs L vs R
    head.add(hat)
    this.registerJoint('hat', hat)

    // BIG brim — much wider than the body so the silhouette has a clear
    // "umbrella" shape that reads in iso. Tapered (narrower top) so the
    // edge profile catches light/shadow at the camera angle.
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.55, 0.12, 18),
      hatMat,
    )
    brim.castShadow = true
    hat.add(brim)

    // Low rounded dome (smaller than the brim — fits inside it)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      hatMat,
    )
    dome.scale.set(1, 0.7, 1)
    dome.position.y = 0.06
    dome.castShadow = true
    hat.add(dome)

    // Peaked finial on top — the diagnostic pith-helmet feature
    const finial = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.18, 8),
      hatMat,
    )
    finial.position.y = 0.28
    finial.castShadow = true
    hat.add(finial)
  }
}

// Stub leg: just a short thick cylinder + dark boot. Visible peeking out
// from under the cloak. The animator can swing this from the hip.
function buildStubLeg(body: THREE.Material, boot: THREE.Material): THREE.Group {
  const leg = new THREE.Group()
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 7), body)
  thigh.position.y = -0.08
  thigh.castShadow = true
  leg.add(thigh)
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.22), boot)
  foot.position.set(0, -0.18, 0.04)
  foot.castShadow = true
  leg.add(foot)
  return leg
}

// Stub arm: short cylinder, slightly tapered. No fist — just a sleeve.
// The chibi reference has barely-visible arms.
function buildStubArm(mat: THREE.Material): THREE.Group {
  const arm = new THREE.Group()
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.26, 7), mat)
  sleeve.position.y = -0.13
  sleeve.castShadow = true
  arm.add(sleeve)
  return arm
}

// Pear/chess-pawn body: lathe profile with a wide hem flare for the cloak,
// narrowing to a neck. Ragged hem jitter at the bottom so the silhouette
// doesn't read as turned-on-a-lathe.
function buildPearBody(): THREE.LatheGeometry {
  const segments = 14
  const points = [
    new THREE.Vector2(0.28, -0.18), // hem (narrower than brim above)
    new THREE.Vector2(0.27, -0.05),
    new THREE.Vector2(0.26, 0.1),
    new THREE.Vector2(0.28, 0.3),   // shoulder bulge
    new THREE.Vector2(0.24, 0.44),
    new THREE.Vector2(0.13, 0.52),  // neck nip
  ]
  const geom = new THREE.LatheGeometry(points, segments)
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    // Hem jitter — ragged silhouette per the cloak hem in the reference
    if (pos.getY(i) < -0.16) {
      const segment = Math.floor(i / points.length) % segments
      const zig = segment % 2 === 0 ? 0.09 : -0.05
      pos.setX(i, pos.getX(i) * (1 + zig))
      pos.setZ(i, pos.getZ(i) * (1 + zig))
    }
  }
  geom.computeVertexNormals()
  return geom
}
