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
    console.warn(`[Structure] Textures missing for "${base}"; using flat fallback.`)
    return null
  }
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

  const wallPbr = await tryLoadPbrSet(loader, 'stone_wall', [8, 1.5])
  const wallMat = wallPbr
    ? new THREE.MeshStandardMaterial(wallPbr)
    : new THREE.MeshStandardMaterial({ color: 0x6e6358, roughness: 0.9, metalness: 0 })

  const north = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, WALL_H, 0.3), wallMat)
  north.position.set(8, WALL_H / 2, 0)
  north.receiveShadow = true
  north.castShadow = true
  group.add(north)

  // South wall split for door gap (door at grid x=4, world x=9, gap = 1 tile = 2m)
  const southLeft = new THREE.Mesh(new THREE.BoxGeometry(4 * TILE, WALL_H, 0.3), wallMat)
  southLeft.position.set(4, WALL_H / 2, 16)
  southLeft.receiveShadow = true
  southLeft.castShadow = true
  group.add(southLeft)

  const southRight = new THREE.Mesh(new THREE.BoxGeometry(3 * TILE, WALL_H, 0.3), wallMat)
  southRight.position.set(8 + 3, WALL_H / 2, 16)
  southRight.receiveShadow = true
  southRight.castShadow = true
  group.add(southRight)

  const east = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 8 * TILE), wallMat)
  east.position.set(16, WALL_H / 2, 8)
  east.receiveShadow = true
  east.castShadow = true
  group.add(east)

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
