import * as THREE from 'three'
import { Category } from '../engine/categories'

export interface UpdateContext {
  [key: string]: unknown
}

// PHYSICS_AND_COLLISION.md § Coordinate model: `position` is the authoritative
// simulation state on the step lattice. The renderer draws it directly.
export abstract class Entity {
  position = new THREE.Vector3()
  categories: Category[] = []
  extents = new THREE.Vector3(1, 1, 1)
  active = true

  abstract update(dt: number, ctx: UpdateContext): void

  // Put the entity back to how the room was built. Moving things override.
  reset(): void {}

  hasCategory(c: Category): boolean {
    return this.categories.includes(c)
  }
}
