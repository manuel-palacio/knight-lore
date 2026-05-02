import * as THREE from 'three'

// Single source of truth for torch placement — Lighting.ts builds the
// PointLights here, TheHall.ts builds the matching visible bracket+flame
// meshes by importing this same array.
export const TORCH_POSITIONS: ReadonlyArray<readonly [number, number, number]> = [
  [0.4, 2.4, 4],   // west wall — south half
  [0.4, 2.4, 12],  // west wall — north half
  [4, 2.4, 0.4],   // north wall — west half
  [12, 2.4, 0.4],  // north wall — east half
]

// Theatrical dungeon lighting. Materials are MeshLambertMaterial (responds
// to lights), so these intensities actually carve the room. Four torches
// distributed along the visible walls keep the whole room playable while
// preserving warm-pool atmosphere — single torch left the far side dark.
export function buildHallLights(): THREE.Object3D[] {
  const moon = new THREE.SpotLight(0x8aa0c8, 1.4, 30, Math.PI / 5, 0.55, 1.4)
  moon.position.set(11, 16, 11)
  moon.target.position.set(8, 0, 8)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)

  const torches: THREE.Object3D[] = []
  for (const [x, y, z] of TORCH_POSITIONS) {
    const torch = new THREE.PointLight(0xff8030, 2.0, 10, 1.6)
    torch.position.set(x, y, z)
    torches.push(torch)
  }

  // Very low cool ambient so unlit pockets stay shadowed but never pitch.
  const ambient = new THREE.AmbientLight(0x6480a0, 0.06)

  return [moon, moon.target, ambient, ...torches]
}
