import * as THREE from 'three'

// Theatrical lighting per ART_DIRECTION § Lighting and spec §9.
export function buildHallLights(): THREE.Object3D[] {
  const moon = new THREE.SpotLight(0x7090c0, 1.2, 30, Math.PI / 8, 0.4, 1)
  moon.position.set(11, 16, 11)
  moon.target.position.set(11, 0, 11)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)

  const torch = new THREE.PointLight(0xff8030, 1.0, 8, 2)
  torch.position.set(0.4, 2.2, 8)

  const ambient = new THREE.AmbientLight(0xffffff, 0.08)

  return [moon, moon.target, torch, ambient]
}
