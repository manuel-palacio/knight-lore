import * as THREE from 'three'

// Theatrical lighting per ART_DIRECTION § Lighting and spec §9.
// Tuned for the no-HDRI case: scene.environment is null until Task 30's HDR
// is sourced, so MeshStandardMaterial gets no env fill — ambient does the
// global lift. With an HDR set, drop ambient back to ~0.1.
export function buildHallLights(): THREE.Object3D[] {
  const moon = new THREE.SpotLight(0x9fb4dc, 2.4, 40, Math.PI / 4.5, 0.5, 1.2)
  moon.position.set(11, 16, 11)
  moon.target.position.set(8, 0, 8)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)

  const torch = new THREE.PointLight(0xff9050, 2.0, 14, 1.5)
  torch.position.set(0.5, 2.4, 8)

  const ambient = new THREE.AmbientLight(0x8090a8, 0.55)

  return [moon, moon.target, torch, ambient]
}
