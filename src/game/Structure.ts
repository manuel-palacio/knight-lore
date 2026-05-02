import * as THREE from 'three'
import type { AssetLoader } from '../engine/AssetLoader'

const TILE = 2
const WALL_H = 3

interface PbrSet {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

async function tryLoadPbrSet(
  loader: AssetLoader,
  base: string,
  repeat: [number, number],
): Promise<PbrSet | null> {
  try {
    const map = await loader.loadTexture(`/assets/textures/${base}_diffuse.jpg`)
    const normalMap = await loader.loadDataTexture(`/assets/textures/${base}_normal.jpg`)
    const roughnessMap = await loader.loadDataTexture(`/assets/textures/${base}_roughness.jpg`)
    for (const t of [map, normalMap, roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(repeat[0], repeat[1])
    }
    return { map, normalMap, roughnessMap }
  } catch {
    return null
  }
}

// Clones a PbrSet so the wall material can have its own repeat without
// stomping on the floor material's repeat (textures share repeat state per
// instance — clone() makes a new texture pointing at the same image).
function cloneWithRepeat(set: PbrSet, repeat: [number, number]): PbrSet {
  const map = set.map.clone()
  const normalMap = set.normalMap.clone()
  const roughnessMap = set.roughnessMap.clone()
  for (const t of [map, normalMap, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat[0], repeat[1])
    t.needsUpdate = true
  }
  return { map, normalMap, roughnessMap }
}

export async function buildStructure(loader: AssetLoader): Promise<THREE.Group> {
  const group = new THREE.Group()

  const floorPbr = await tryLoadPbrSet(loader, 'stone_floor', [8, 8])
  const floorMat = floorPbr
    ? new THREE.MeshStandardMaterial(floorPbr)
    : new THREE.MeshStandardMaterial({ color: 0x3a342d, roughness: 0.95, metalness: 0 })
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, 0.3, 8 * TILE), floorMat)
  floor.position.set(8, -0.15, 8)
  floor.receiveShadow = true
  group.add(floor)

  // Walls reuse the floor's cobblestone PBR set with wall-shape repeat
  // (8 × 1.5 = ~2m square per tile). Fall back to flat color if the floor
  // textures themselves are missing.
  const wallPbr = floorPbr ? cloneWithRepeat(floorPbr, [8, 1.5]) : null
  const wallMat = wallPbr
    ? new THREE.MeshStandardMaterial(wallPbr)
    : new THREE.MeshStandardMaterial({ color: 0x6e6358, roughness: 0.9, metalness: 0 })

  // Knight Lore convention: render only the two BACK walls (north + west)
  // facing the camera. South + east are omitted so the player can see in.
  // Collision still works — Grid treats out-of-bounds cells as solid.
  const north = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, WALL_H, 0.3), wallMat)
  north.position.set(8, WALL_H / 2, 0)
  north.receiveShadow = true
  north.castShadow = true
  group.add(north)

  const west = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 8 * TILE), wallMat)
  west.position.set(0, WALL_H / 2, 8)
  west.receiveShadow = true
  west.castShadow = true
  group.add(west)

  return group
}

export function buildLedgeMesh(material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
