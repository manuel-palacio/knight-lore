import * as THREE from 'three'

const PARTICLE_COUNT = 40

export class ParticleBurst {
  readonly mesh: THREE.Points
  private velocities: Float32Array
  private lifetime = 0
  private active = false

  constructor() {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xff8030,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    this.mesh = new THREE.Points(geom, mat)
    this.mesh.visible = false
    this.velocities = new Float32Array(PARTICLE_COUNT * 3)
  }

  burst(at: THREE.Vector3): void {
    this.active = true
    this.lifetime = 0
    this.mesh.visible = true
    const positions = (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] = at.x
      positions[i * 3 + 1] = at.y + 1
      positions[i * 3 + 2] = at.z
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3
      const speed = 1 + Math.random() * 2
      this.velocities[i * 3 + 0] = Math.cos(angle) * speed
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 3
      this.velocities[i * 3 + 2] = Math.sin(angle) * speed
    }
    (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }

  update(dt: number): void {
    if (!this.active) return
    this.lifetime += dt
    const positions = (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] += this.velocities[i * 3 + 0] * dt
      positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt
      positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt
      this.velocities[i * 3 + 1] -= 6 * dt
    }
    (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    if (this.lifetime > 1.0) {
      this.active = false
      this.mesh.visible = false
    }
  }
}
