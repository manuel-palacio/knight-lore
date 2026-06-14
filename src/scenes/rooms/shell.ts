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
import { makeToonMaterial, makeHeroMaterial } from '../../game/Materials'
import type { Entity } from '../../game/Entity'
import type { AssetLoader } from '../../engine/AssetLoader'

export const TILE = 2

export function tileCenter(cell: number): number {
  return cell * TILE + TILE / 2
}

// Per-room colour: each Knight Lore room had a dominant ZX-Spectrum tint
// (yellow / blue / green / purple). We add a coloured PointLight high above
// the room to wash the walls/floor in that hue without losing readability.
export type RoomTint = 'yellow' | 'blue' | 'green' | 'purple' | 'red'

const TINT_RGB: Record<RoomTint, number> = {
  yellow: 0xffc060,
  blue: 0x4080c0,
  green: 0x40b070,
  purple: 0xa050c0,
  red: 0xc04050,
}

// Wall variants — each room can pick a flavour so they don't all look
// identical. Castle = tall walls with battlements. Tower = even taller,
// no battlements (clean turret look). Dungeon = shorter, no battlements
// (low ruined feel). Hazard = mid-height with no battlements.
export type RoomStyle = 'castle' | 'tower' | 'dungeon' | 'hazard'

const STYLE_TO_WALL: Record<RoomStyle, { height: number; battlement: boolean; cornerPillar: boolean }> = {
  castle:  { height: 3.6, battlement: true,  cornerPillar: true },
  tower:   { height: 4.4, battlement: false, cornerPillar: true },
  dungeon: { height: 2.6, battlement: false, cornerPillar: false },
  hazard:  { height: 3.0, battlement: true,  cornerPillar: false },
}

export async function buildRoomShell(
  id: string,
  loader: AssetLoader,
  tint: RoomTint = 'yellow',
  exits: ('north' | 'south' | 'east' | 'west')[] = [],
  style: RoomStyle = 'castle',
): Promise<Room> {
  const room = new Room(id, 8, 8)
  room.tint = TINT_RGB[tint]
  const cfg = STYLE_TO_WALL[style]
  room.group.add(await buildStructure(loader, {
    exits,
    wall: { height: cfg.height, battlement: cfg.battlement },
    cornerPillar: cfg.cornerPillar,
  }))
  for (const light of buildHallLights()) room.group.add(light)
  for (const [x, y, z] of TORCH_POSITIONS) room.addTorch(new Torch(x, y, z))
  return room
}

// Subtle warm light under each exit arch — players found dark exits invisible.
function addExitBeacon(room: Room, x: number, z: number): void {
  const light = new THREE.PointLight(0xffa050, 2.0, 7, 1.3)
  light.position.set(x, 1.6, z)
  room.group.add(light)
}

// Arch + light for S/E exits (N/W exit arches are placed by buildStructure
// because they sit IN a wall gap). This still adds the beacon for every
// side so the player has a glow to walk toward.
export function addExitArch(room: Room, direction: 'north' | 'south' | 'east' | 'west'): void {
  const mid = 4 * TILE
  const edge = 8 * TILE - 0.25
  if (direction === 'north') {
    addExitBeacon(room, mid, 0.85)
    return
  }
  if (direction === 'west') {
    addExitBeacon(room, 0.85, mid)
    return
  }
  if (direction === 'south') {
    const z = edge
    room.group.add(buildArch(mid, z))
    addExitBeacon(room, mid, z - 0.6)
    return
  }
  // east
  const arch = buildArch(0, 0)
  arch.rotation.y = Math.PI / 2
  arch.position.set(edge, 0, mid)
  room.group.add(arch)
  addExitBeacon(room, edge - 0.6, mid)
}

// Raised sandstone platform — repeat the single-brick texture across the
// platform face so each brick reads at world scale (~1m wide × 0.5m tall).
export function addPlatform(room: Room, gridX: number, gridZ: number, height: number): void {
  const block = new StaticBlock(gridX, gridZ, height)
  const tex = makeBrickTexture(SANDSTONE_PALETTE)
  // 2m face: 2 bricks across × (height/0.5) rows tall
  tex.repeat.set(2, height / 0.5)
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TILE, height, TILE),
    new THREE.MeshBasicMaterial({ map: tex }),
  )
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

// Small ghost/blob shape — see 2.png. Wide rounded base, tapered top, two
// little eyes. Low to the floor, hovers and bobs. Reads as a creature at
// the isometric camera distance, not a tall capsule.
function buildPatrolFigure(): THREE.Group {
  const g = new THREE.Group()
  const body = makeHeroMaterial(0xc04060) // glowy pink-magenta like 2.png
  const eye = makeToonMaterial(0x080808)

  // Wide bottom hemisphere
  const skirt = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6),
    body,
  )
  skirt.position.y = 0
  g.add(skirt)

  // Rounded body — slightly squashed sphere
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), body)
  blob.position.y = 0.05
  blob.scale.set(1, 1.1, 1)
  g.add(blob)

  // Two small eyes
  for (const sign of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eye)
    e.position.set(0.14 * sign, 0.18, 0.28)
    g.add(e)
  }

  return g
}

// Patrol enemy: floating ghost-blob shape, hovers slightly above the floor.
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
  attachOffsetMesh(enemy, figure, 0.45)
  room.add(enemy)
  return enemy
}

// Amber push-block slab (1.0 high so a 1.0 jump can climb it — see Task 2).
export function addPushBlock(room: Room, gridX: number, gridZ: number): void {
  const block = new PushBlock(gridX, gridZ)
  const tex = makeBrickTexture(AMBER_BLOCK_PALETTE)
  // 1.6m face: ~2 bricks across, 2 rows tall (brick is 1m × 0.5m)
  tex.repeat.set(1.6, 2)
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.0, 1.6),
    new THREE.MeshBasicMaterial({ map: tex }),
  )
  block.placeOnGrid(room.grid, TILE)
  attachOffsetMesh(block, mesh, 0.5)
  room.add(block)
}
