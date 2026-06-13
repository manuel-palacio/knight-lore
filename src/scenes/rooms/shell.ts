import * as THREE from 'three'
import { Room } from '../../game/Room'
import {
  buildStructure,
  buildArch,
  makeBrickTexture,
  SANDSTONE_PALETTE,
  AMBER_BLOCK_PALETTE,
} from '../../game/Structure'
import { buildHallLights } from '../../game/Lighting'
import { Torch, TORCH_POSITIONS } from '../../game/Torch'
import { StaticBlock } from '../../game/StaticBlock'
import { PushBlock } from '../../game/PushBlock'
import { PatrolEnemy } from '../../game/PatrolEnemy'
import { makeToonMaterial } from '../../game/Materials'
import type { Entity } from '../../game/Entity'
import type { AssetLoader } from '../../engine/AssetLoader'

export const TILE = 2

export function tileCenter(cell: number): number {
  return cell * TILE + TILE / 2
}

export async function buildRoomShell(id: string, loader: AssetLoader): Promise<Room> {
  const room = new Room(id, 8, 8)
  room.group.add(await buildStructure(loader))
  for (const light of buildHallLights()) room.group.add(light)
  for (const [x, y, z] of TORCH_POSITIONS) room.addTorch(new Torch(x, y, z))
  return room
}

// Subtle warm light under each exit arch — no floor ring (looked bad).
function addExitBeacon(room: Room, x: number, z: number): void {
  const light = new THREE.PointLight(0xffa050, 2.0, 7, 1.3)
  light.position.set(x, 1.6, z)
  room.group.add(light)
}

// Arch marking an exit. buildArch lays columns along x (north/south wall
// plane); east/west exits get the same group rotated 90°. A glowing floor
// halo + warm light underneath the arch makes the exit visible in the dim
// scene.
export function addExitArch(room: Room, direction: 'north' | 'south' | 'east' | 'west'): void {
  const mid = 4 * TILE // 8 — center of the 16-unit wall
  const edge = 8 * TILE - 0.25
  if (direction === 'north' || direction === 'south') {
    const z = direction === 'north' ? 0.25 : edge
    room.group.add(buildArch(mid, z))
    addExitBeacon(room, mid, z + (direction === 'north' ? 0.6 : -0.6))
    return
  }
  const arch = buildArch(0, 0)
  arch.rotation.y = Math.PI / 2
  const x = direction === 'west' ? 0.25 : edge
  arch.position.set(x, 0, mid)
  room.group.add(arch)
  addExitBeacon(room, x + (direction === 'west' ? 0.6 : -0.6), mid)
}

// Raised sandstone platform: solid grid cell + visible mesh, the same
// pairing TheHall used for its ledge.
export function addPlatform(room: Room, gridX: number, gridZ: number, height: number): void {
  const block = new StaticBlock(gridX, gridZ, height)
  const tex = makeBrickTexture(SANDSTONE_PALETTE)
  tex.repeat.set(1, 1)
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TILE, height, TILE),
    new THREE.MeshLambertMaterial({ map: tex }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(tileCenter(gridX), height / 2, tileCenter(gridZ))
  room.group.add(mesh)
  block.placeOnGrid(room.grid, TILE)
  room.add(block)
}

// Wrap a mesh in a Group with a fixed y-offset and assign it as the entity's
// object3D. Why: Entity.updateRenderPosition copies the entity's
// renderPosition onto object3D.position every frame, which overwrites any
// direct y-offset set on the mesh. Putting the offset INSIDE a Group keeps
// it local and untouchable. Caller must still room.add(entity) afterwards.
export function attachOffsetMesh(entity: Entity, mesh: THREE.Object3D, yOffset: number): void {
  const group = new THREE.Group()
  mesh.position.y = yOffset
  group.add(mesh)
  entity.object3D = group
  group.position.copy(entity.position)
}

// Build a small skeleton-knight figure (head, hooded body, arms) instead of
// a featureless capsule. Compound so it reads as a character at the camera
// distance instead of a "blob".
function buildPatrolFigure(): THREE.Group {
  const g = new THREE.Group()
  const cloak = makeToonMaterial(0x6a1a1a)
  const skin = makeToonMaterial(0xd9b378)
  const metal = makeToonMaterial(0x8a7060)

  // Hooded body — tapered cylinder
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.1, 12), cloak)
  body.position.y = 0
  g.add(body)

  // Head with hood — sphere
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin)
  head.position.y = 0.78
  g.add(head)
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), cloak)
  hood.position.y = 0.78
  g.add(hood)

  // Arms — short cylinders by the sides
  for (const sign of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 8), cloak)
    arm.position.set(0.32 * sign, 0.05, 0)
    arm.rotation.z = sign * 0.15
    g.add(arm)
  }

  // Belt — thin torus around the waist
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 6, 18), metal)
  belt.rotation.x = -Math.PI / 2
  belt.position.y = 0
  g.add(belt)

  return g
}

// Standard patrol enemy: skeleton-knight figure, with the y-offset wrapped
// in a Group so it doesn't sink into the floor.
export function addPatrolEnemy(
  room: Room,
  a: { x: number; z: number },
  b: { x: number; z: number },
  speed?: number,
): PatrolEnemy {
  const enemy = new PatrolEnemy(a, b, speed)
  const figure = buildPatrolFigure()
  figure.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true
  })
  attachOffsetMesh(enemy, figure, 0.55)
  room.add(enemy)
  return enemy
}

// Amber push-block slab (1.0 high so a 1.0 jump can climb it — see Task 2).
export function addPushBlock(room: Room, gridX: number, gridZ: number): void {
  const block = new PushBlock(gridX, gridZ)
  const tex = makeBrickTexture(AMBER_BLOCK_PALETTE)
  tex.repeat.set(0.8, 0.8)
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.0, 1.6),
    new THREE.MeshLambertMaterial({ map: tex }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  block.placeOnGrid(room.grid, TILE)
  attachOffsetMesh(block, mesh, 0.5)
  room.add(block)
}
