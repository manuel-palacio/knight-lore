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

async function tryLoadTile(
  loader: AssetLoader,
  url: string,
  repeat: [number, number],
): Promise<THREE.Texture | null> {
  try {
    const tex = await loader.loadTexture(url)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestMipmapLinearFilter
    return tex
  } catch {
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

  // Pixel-art tiles take precedence over the PBR set. If both tiles exist,
  // mix them across walls (tile1 = front/back, tile2 = sides) for variety.
  // Repeat (16, 3) = 1 tile per game-cell square (~1m × 1m).
  const wallRepeat: [number, number] = [16, 3]
  const wallTile1 = await tryLoadTile(loader, '/assets/textures/stone_wall_texture_tile.png', wallRepeat)
  const wallTile2 = await tryLoadTile(loader, '/assets/textures/stone_wall_texture_tile2.png', wallRepeat)
  const wallPbr = (wallTile1 || wallTile2) ? null : await tryLoadPbrSet(loader, 'stone_wall', [8, 1.5])
  const flatWall = new THREE.MeshStandardMaterial({ color: 0x6e6358, roughness: 0.9, metalness: 0 })
  const matFromTile = (t: THREE.Texture) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, metalness: 0 })
  const matAB = wallTile1 && wallTile2
    ? { a: matFromTile(wallTile1), b: matFromTile(wallTile2) }
    : wallTile1
      ? { a: matFromTile(wallTile1), b: matFromTile(wallTile1) }
      : wallTile2
        ? { a: matFromTile(wallTile2), b: matFromTile(wallTile2) }
        : wallPbr
          ? { a: new THREE.MeshStandardMaterial(wallPbr), b: new THREE.MeshStandardMaterial(wallPbr) }
          : { a: flatWall, b: flatWall }

  // Knight Lore convention: render only the two BACK walls (north + west)
  // facing the camera. The south + east walls would block the player's view
  // of the play area, so they're omitted. Collision still works — Grid
  // treats out-of-bounds cells as solid regardless of visible geometry.
  const north = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, WALL_H, 0.3), matAB.a)
  north.position.set(8, WALL_H / 2, 0)
  north.receiveShadow = true
  north.castShadow = true
  group.add(north)

  const west = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 8 * TILE), matAB.b)
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
