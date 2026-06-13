import * as THREE from 'three'
import { Pickup } from '../../game/Pickup'
import { makeHeroMaterial, makeToonMaterial } from '../../game/Materials'
import type { Room } from '../../game/Room'
import { tileCenter } from './shell'

export type ItemId = 'goblet' | 'gem' | 'wine-bottle' | 'crystal-ball'

const ITEM_COLOR: Record<ItemId, number> = {
  'goblet': 0xffd95a,
  'gem': 0x66ff88,
  'wine-bottle': 0xff5577,
  'crystal-ball': 0xaaddff,
}

// Compound geometries — recognizable silhouettes instead of a single primitive.
function buildGoblet(): THREE.Group {
  const g = new THREE.Group()
  const gold = makeHeroMaterial(0xffd95a)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10), gold)
  stem.position.y = 0.15
  g.add(stem)
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 14), gold)
  foot.position.y = 0.04
  g.add(foot)
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), gold)
  knot.position.y = 0.17
  g.add(knot)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.25, 14, 1, true), gold)
  bowl.position.y = 0.42
  g.add(bowl)
  return g
}

function buildGem(): THREE.Group {
  const g = new THREE.Group()
  const green = makeHeroMaterial(0x44ff88)
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 6), green)
  top.position.y = 0.15
  g.add(top)
  const bot = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.25, 6), green)
  bot.position.y = -0.12
  bot.rotation.x = Math.PI
  g.add(bot)
  return g
}

function buildWineBottle(): THREE.Group {
  const g = new THREE.Group()
  const glass = makeHeroMaterial(0x8a1a3a)
  glass.opacity = 0.95
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.5, 14), glass)
  body.position.y = 0.25
  g.add(body)
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.15, 14), glass)
  shoulder.position.y = 0.575
  g.add(shoulder)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 12), glass)
  neck.position.y = 0.74
  g.add(neck)
  const cork = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12),
    makeToonMaterial(0x6a4a20),
  )
  cork.position.y = 0.85
  g.add(cork)
  return g
}

function buildCrystalBall(): THREE.Group {
  const g = new THREE.Group()
  const blue = makeHeroMaterial(0xaaddff)
  blue.opacity = 0.85
  blue.transparent = true
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), blue)
  ball.position.y = 0.28
  g.add(ball)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.08, 14),
    makeToonMaterial(0x4a3220),
  )
  base.position.y = 0.04
  g.add(base)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.025, 8, 18),
    makeToonMaterial(0x6a4820),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.09
  g.add(ring)
  return g
}

const BUILDERS: Record<ItemId, () => THREE.Group> = {
  'goblet': buildGoblet,
  'gem': buildGem,
  'wine-bottle': buildWineBottle,
  'crystal-ball': buildCrystalBall,
}

// Item Group: the compound shape + a floor halo flagged with userData.halo
// so the carry code can hide it (otherwise it wraps the player).
export function makeItemMesh(id: ItemId): THREE.Object3D {
  const group = new THREE.Group()
  const shape = BUILDERS[id]()
  shape.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true
  })
  group.add(shape)

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.55, 24),
    new THREE.MeshBasicMaterial({
      color: ITEM_COLOR[id],
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  halo.rotation.x = -Math.PI / 2
  halo.position.y = -0.18
  halo.userData.halo = true
  group.add(halo)

  return group
}

export function addPickup(room: Room, id: ItemId, gridX: number, gridZ: number, y = 0.4): Pickup {
  const pickup = new Pickup(id)
  pickup.object3D = makeItemMesh(id)
  pickup.position.set(tileCenter(gridX), y, tileCenter(gridZ))
  pickup.renderPosition.copy(pickup.position)
  pickup.object3D.position.copy(pickup.position)
  room.add(pickup)
  return pickup
}
