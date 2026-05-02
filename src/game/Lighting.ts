import * as THREE from 'three'

// Theatrical dungeon lighting. Materials are MeshLambertMaterial (responds
// to lights), so these intensities actually carve the room: a warm pool
// from the corner torch, a cool spotlight from above, and very low ambient
// so unlit areas stay genuinely dark.
export function buildHallLights(): THREE.Object3D[] {
  // Cool moon spot from above the centre — narrow cone, dramatic.
  const moon = new THREE.SpotLight(0x8aa0c8, 1.8, 30, Math.PI / 5, 0.55, 1.4)
  moon.position.set(11, 16, 11)
  moon.target.position.set(8, 0, 8)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)

  // Warm torch in the SW corner — natural inverse-square decay, intense
  // enough to feel like a real flame nearby. Position matches buildTorch().
  const torch = new THREE.PointLight(0xff8030, 4.0, 12, 1.6)
  torch.position.set(0.5, 2.4, 8)
  torch.castShadow = true
  torch.shadow.mapSize.set(512, 512)

  // Very low cool ambient so unlit walls aren't pitch-black but read as
  // shadowed stone. With an HDR set on scene.environment, the indirect
  // lighting also lifts mid-tones a bit; ambient here is the safety net.
  const ambient = new THREE.AmbientLight(0x6480a0, 0.06)

  return [moon, moon.target, torch, ambient]
}
