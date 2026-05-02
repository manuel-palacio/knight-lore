import * as THREE from 'three'

const BASE_INTENSITY = 2.4
const LIGHT_RANGE = 14
const LIGHT_FLICKER = 0.30
const FLAME_SCALE_FLICKER = 0.35
const FLAME_Y_FLICKER = 0.05

export const TORCH_POSITIONS: ReadonlyArray<readonly [number, number, number]> = [
  [0.4, 2.4, 4],
  [0.4, 2.4, 12],
  [4, 2.4, 0.4],
  [12, 2.4, 0.4],
]

// Bundles the visible bracket+flame mesh with its PointLight so flicker
// animates both in lockstep. Each torch starts at a randomised phase so
// they don't pulse in unison.
export class Torch {
  readonly group: THREE.Group
  readonly light: THREE.PointLight
  private flame: THREE.Mesh
  private flameBaseY: number
  private phase: number

  constructor(x: number, y: number, z: number) {
    this.group = new THREE.Group()
    this.phase = Math.random() * Math.PI * 2

    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.3, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x2a1a10 }),
    )
    bracket.position.set(x, y, z)
    this.group.add(bracket)

    this.flameBaseY = y + 0.3
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.4, 6),
      new THREE.MeshBasicMaterial({ color: 0xff9040 }),
    )
    this.flame.position.set(x, this.flameBaseY, z)
    this.group.add(this.flame)

    this.light = new THREE.PointLight(0xff8030, BASE_INTENSITY, LIGHT_RANGE, 1.6)
    this.light.position.set(x, this.flameBaseY, z)
  }

  update(dt: number): void {
    this.phase += dt
    const f =
      Math.sin(this.phase * 11) * 0.55 +
      Math.sin(this.phase * 23 + 1.3) * 0.30 +
      Math.sin(this.phase * 47 + 2.7) * 0.15

    this.light.intensity = BASE_INTENSITY * (1 + f * LIGHT_FLICKER)
    const scale = 1 + f * FLAME_SCALE_FLICKER
    this.flame.scale.set(scale, scale, scale)
    this.flame.position.y = this.flameBaseY + f * FLAME_Y_FLICKER
  }
}
