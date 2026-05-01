import * as THREE from 'three'
import { Category } from '../engine/categories'

export interface UpdateContext {
  [key: string]: unknown
}

// PHYSICS_AND_COLLISION.md § Coordinate model:
//   position: authoritative simulation state, integer-grid + height
//   renderPosition: visual-only, lerped, NEVER read by gameplay logic
// Linter rule (pnpm lint:no-render-pos) enforces renderPosition appears
// only in this file and Renderer.ts.
export abstract class Entity {
  position = new THREE.Vector3()
  renderPosition = new THREE.Vector3()
  categories: Category[] = []
  object3D: THREE.Object3D | null = null
  extents = new THREE.Vector3(1, 1, 1)
  active = true

  abstract update(dt: number, ctx: UpdateContext): void

  hasCategory(c: Category): boolean {
    return this.categories.includes(c)
  }

  updateRenderPosition(alpha = 0.18): void {
    this.renderPosition.lerp(this.position, alpha)
    if (this.object3D) {
      this.object3D.position.copy(this.renderPosition)
    }
  }
}
