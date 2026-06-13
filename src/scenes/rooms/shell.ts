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
  mesh.position.y = 0.5 // local offset inside the Group — can't be clobbered by the entity tick

  const group = new THREE.Group()
  group.add(mesh)
  block.object3D = group

  block.placeOnGrid(room.grid, TILE)
  group.position.copy(block.position)
  room.group.add(group)
  room.add(block)
}
