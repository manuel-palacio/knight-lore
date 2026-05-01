import * as THREE from 'three'
import type { Room } from '../game/Room'
import { Category } from './categories'

export class DebugOverlay {
  visible = false
  private group: THREE.Group

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group()
    this.group.visible = false
    scene.add(this.group)
  }

  toggle(): void {
    this.visible = !this.visible
    this.group.visible = this.visible
  }

  refresh(room: Room): void {
    this.group.clear()
    if (!this.visible) return

    for (const e of room.entities) {
      const color =
        e.hasCategory(Category.SOLID_WORLD) ? 0xff0000 :
        e.hasCategory(Category.SOLID_DYNAMIC) ? 0xff8800 :
        e.hasCategory(Category.PICKUP_TRIGGER) ? 0x00ff00 :
        e.hasCategory(Category.HAZARD) ? 0xff00ff :
        e.hasCategory(Category.SUPPORT_SURFACE) ? 0x0088ff :
        0xaaaaaa

      const helper = new THREE.Box3Helper(
        new THREE.Box3(
          new THREE.Vector3(
            e.position.x - e.extents.x / 2,
            e.position.y,
            e.position.z - e.extents.z / 2,
          ),
          new THREE.Vector3(
            e.position.x + e.extents.x / 2,
            e.position.y + e.extents.y,
            e.position.z + e.extents.z / 2,
          ),
        ),
        new THREE.Color(color),
      )
      this.group.add(helper)
    }
  }
}
