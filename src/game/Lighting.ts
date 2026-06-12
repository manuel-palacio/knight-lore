import * as THREE from 'three'

// Theatrical dungeon lighting. Architecture uses MeshLambertMaterial so
// the moon spotlight + hemisphere fill carve the room. Torches are owned
// by the Torch class (game/Torch.ts).
export function buildHallLights(): THREE.Object3D[] {
  const moon = new THREE.SpotLight(0x8aa0c8, 3.4, 35, Math.PI / 3.5, 0.5, 1.3)
  moon.position.set(11, 16, 11)
  moon.target.position.set(8, 0, 8)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  // Tier 1: shadow bias prevents acne on surfaces nearly parallel to the
  // light direction; normalBias offsets along the surface normal so corners
  // don't self-shadow.
  moon.shadow.bias = -0.0001
  moon.shadow.normalBias = 0.02

  // Hemisphere fill — cool from above (moonlight bouncing off the
  // overcast sky beyond the room), warm from below (torches bouncing
  // off the floor). Slightly bumped vs the previous baseline so the
  // SE corner — out of torch range and in the moon's penumbra falloff —
  // doesn't read as black.
  const hemi = new THREE.HemisphereLight(0x6080a0, 0x4a2818, 1.9)

  // Cool "moonbeam" PointLight in the SE area. Pure stage-lighting fill
  // (no mesh, no shadow) — tuned to match the brightness of the corners
  // that DO get a real torch (NW/NE/SW each have a torch within ~5m at
  // intensity 2.4). Pretending the SE wall has its own torch gives even
  // exposure across the four corners.
  const seFill = new THREE.PointLight(0x9eb6d4, 2.0, 16, 1.0)
  seFill.position.set(14, 5, 14)

  // Cool ambient floor — high enough that the room always reads
  // (player feedback: the scene must be visible first, moody second).
  const ambient = new THREE.AmbientLight(0x404858, 0.85)

  return [moon, moon.target, hemi, seFill, ambient]
}
