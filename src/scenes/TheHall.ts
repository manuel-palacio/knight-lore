import * as THREE from 'three'
import { Room } from '../game/Room'
import { Player } from '../game/Player'
import { PushBlock } from '../game/PushBlock'
import { StaticBlock } from '../game/StaticBlock'
import { Pickup } from '../game/Pickup'
import { Door } from '../game/Door'
import { PatrolEnemy } from '../game/PatrolEnemy'
import { Entity } from '../game/Entity'
import { ParticleBurst } from '../game/ParticleBurst'
import { Category } from '../engine/categories'
import {
  buildStructure,
  buildArch,
  makeBrickTexture,
  SANDSTONE_PALETTE,
  AMBER_BLOCK_PALETTE,
} from '../game/Structure'
import { buildHallLights } from '../game/Lighting'
import { Torch, TORCH_POSITIONS } from '../game/Torch'
import { makeToonMaterial } from '../game/Materials'
import { CharacterVisual } from '../game/characters/CharacterVisual'
import type { AssetLoader } from '../engine/AssetLoader'
import type { GameState } from '../game/GameState'

const TILE = 2

export interface HallBuild {
  room: Room
  player: Player
  visual: CharacterVisual
  enemy: PatrolEnemy
  door: Door
  goblet: Pickup
  burst: ParticleBurst
  torches: Torch[]
}

class StaticVisual extends Entity {
  constructor(mesh: THREE.Object3D) {
    super()
    this.categories = [Category.DECORATIVE]
    this.object3D = mesh
  }
  update(): void {}
}

export async function buildTheHall(
  scene: THREE.Scene,
  loader: AssetLoader,
  state: GameState,
): Promise<HallBuild> {
  const room = new Room('the-hall', 8, 8)

  const structure = await buildStructure(loader)
  room.group.add(structure)

  for (const l of buildHallLights()) room.group.add(l)

  // Static raised ledge at grid (5,5), 2m cube. Sandstone-tan bricks —
  // visually distinct from the walls so the player reads it as architecture
  // they can stand on rather than wall-they-bounce-off-of.
  const ledge = new StaticBlock(5, 5, 2)
  const ledgeTex = makeBrickTexture(SANDSTONE_PALETTE)
  ledgeTex.repeat.set(1, 1)
  const ledgeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshLambertMaterial({ map: ledgeTex }),
  )
  ledgeMesh.castShadow = true
  ledgeMesh.receiveShadow = true
  ledgeMesh.position.set(5 * TILE + TILE / 2, 1, 5 * TILE + TILE / 2)
  room.group.add(ledgeMesh)
  ledge.placeOnGrid(room.grid, TILE)
  room.add(ledge)

  // Push-block at grid (3,5). Amber bricks — warmer than the walls, signals
  // "moveable" by being slightly different in colour from the architecture.
  const block = new PushBlock(3, 5)
  const blockTex = makeBrickTexture(AMBER_BLOCK_PALETTE)
  blockTex.repeat.set(0.8, 0.8)
  const blockMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshLambertMaterial({ map: blockTex }),
  )
  blockMesh.castShadow = true
  blockMesh.receiveShadow = true
  block.object3D = blockMesh
  block.placeOnGrid(room.grid, TILE)
  blockMesh.position.copy(block.position)
  blockMesh.position.y = 0.8
  room.group.add(blockMesh)
  room.add(block)

  // Goblet on top of ledge
  const goblet = new Pickup('goblet')
  const gobletMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.1, 0.4, 12),
    makeToonMaterial(0xd4af37),
  )
  gobletMesh.castShadow = true
  goblet.object3D = gobletMesh
  goblet.position.set(5 * TILE + TILE / 2, 2.2, 5 * TILE + TILE / 2)
  goblet.renderPosition.copy(goblet.position)
  gobletMesh.position.copy(goblet.position)
  room.group.add(gobletMesh)
  room.add(goblet)

  // Door at south
  const door = new Door('south', () => state.hasItem('goblet'))
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.4, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x3a2818 }),
  )
  doorMesh.castShadow = true
  door.object3D = doorMesh
  door.position.set(4 * TILE + TILE / 2, 1.2, 8 * TILE - 0.1)
  door.renderPosition.copy(door.position)
  doorMesh.position.copy(door.position)
  room.group.add(doorMesh)
  door.onOpen = () => {
    doorMesh.rotation.y = -Math.PI / 2
    doorMesh.position.x -= 1
    doorMesh.position.z += 1
  }
  room.add(door)

  // Decorative cauldron set-piece at grid (1,1)
  const cauldronMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    makeToonMaterial(0x2d2620),
  )
  cauldronMesh.position.set(1 * TILE + TILE / 2, 0.5, 1 * TILE + TILE / 2)
  cauldronMesh.castShadow = true
  room.group.add(cauldronMesh)
  room.add(new StaticVisual(cauldronMesh))

  // Patrol enemy along world z=9 between x=5..13
  const enemy = new PatrolEnemy({ x: 5, z: 9 }, { x: 13, z: 9 })
  const enemyMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
    makeToonMaterial(0x884444),
  )
  enemyMesh.castShadow = true
  enemy.object3D = enemyMesh
  enemyMesh.position.copy(enemy.position)
  enemyMesh.position.y = 0.9
  room.group.add(enemyMesh)
  room.add(enemy)

  // Player spawn at grid (1,3)
  const player = new Player()
  const visual = new CharacterVisual()
  player.object3D = visual.group
  player.position.set(1 * TILE + TILE / 2, 0, 3 * TILE + TILE / 2)
  player.renderPosition.copy(player.position)
  visual.group.position.copy(player.position)
  room.add(player)
  room.setSpawn(player.position.x, player.position.z)

  // Stone arch framing the south door (the only visible exit from the
  // camera's POV — the south wall itself is omitted). Adds the Knight Lore
  // silhouette around what was previously a floating door slab.
  const arch = buildArch(4 * TILE + TILE / 2, 8 * TILE - 0.1)
  room.group.add(arch)

  // Torches: each owns its mesh + PointLight + flicker phase. main.ts
  // calls torch.update(dt) in the simulation loop to animate flicker.
  const torches: Torch[] = TORCH_POSITIONS.map(([x, y, z]) => {
    const torch = new Torch(x, y, z)
    room.group.add(torch.group)
    room.group.add(torch.light)
    return torch
  })

  const burst = new ParticleBurst()
  room.group.add(burst.mesh)

  scene.add(room.group)
  return { room, player, visual, enemy, door, goblet, burst, torches }
}
