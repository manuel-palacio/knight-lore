import * as THREE from 'three'

// Hero material per spec §6.6: MeshToonMaterial with 3-step ramp.
// NEVER PBR for hero meshes (rule 9).
export function makeToonMaterial(color: THREE.ColorRepresentation = 0xc0a070): THREE.MeshToonMaterial {
  const ramp = new Uint8Array([60, 60, 60, 255, 160, 160, 160, 255, 240, 240, 240, 255])
  const gradient = new THREE.DataTexture(ramp, 3, 1, THREE.RGBAFormat)
  gradient.needsUpdate = true
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient })
}

export function makeStoneMaterial(color = 0x6e6358): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 })
}
