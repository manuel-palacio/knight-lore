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

// Arch marking an exit. buildArch lays columns along x (north/south wall
// plane); east/west exits get the same group rotated 90°.
export function addExitArch(room: Room, direction: 'north' | 'south' | 'east' | 'west'): void {
  const mid = 4 * TILE // 8 — center of the 16-unit wall
  const edge = 8 * TILE - 0.25
  if (direction === 'north' || direction === 'south') {
    room.group.add(buildArch(mid, direction === 'north' ? 0.25 : edge))
    return
  }
  const arch = buildArch(0, 0)
  arch.rotation.y = Math.PI / 2
  arch.position.set(direction === 'west' ? 0.25 : edge, 0, mid)
  room.group.add(arch)
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

// Standard patrol enemy: capsule body, dusty red, with the y-offset wrapped
// so it doesn't sink into the floor.
export function addPatrolEnemy(
  room: Room,
  a: { x: number; z: number },
  b: { x: number; z: number },
  speed?: number,
): PatrolEnemy {
  const enemy = new PatrolEnemy(a, b, speed)
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
    makeToonMaterial(0x884444),
  )
  mesh.castShadow = true
  attachOffsetMesh(enemy, mesh, 0.9)
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
