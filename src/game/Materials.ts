import * as THREE from 'three'

// MeshToonMaterial samples its gradientMap with the Lambert light intensity
// (0..1) → R channel → step colour. NearestFilter is critical: without it
// the GPU bilinearly interpolates between steps, defeating cel-shading
// (you get smooth Lambert instead). RedFormat = 1 byte/texel, the smallest
// gradient that does the job.
export function makeToonMaterial(color: THREE.ColorRepresentation = 0xc0a070): THREE.MeshToonMaterial {
  // Three step values: shadow / mid / lit. Shadow lifted to 110 (was 60)
  // so the unlit side of toon-shaded heroes stays visibly readable in the
  // dim dungeon — at 60 they merged into the warm-brown architecture.
  const ramp = new Uint8Array([110, 180, 245])
  const gradient = new THREE.DataTexture(ramp, 3, 1, THREE.RedFormat)
  gradient.minFilter = THREE.NearestFilter
  gradient.magFilter = THREE.NearestFilter
  gradient.needsUpdate = true
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient })
}

// Hero variant: a self-lit emissive base (like the original game's always-
// bright sprite) keeps the player readable in any room lighting while the
// toon ramp still adds form. Intensity stays below the bloom threshold.
export function makeHeroMaterial(color: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  const material = makeToonMaterial(color)
  material.emissive = new THREE.Color(color)
  material.emissiveIntensity = 0.35
  return material
}
