import * as THREE from 'three'
import { Pickup } from '../../game/Pickup'
import { PixelSprite } from '../../game/PixelSprite'
import type { Room } from '../../game/Room'
import { tileCenter } from './shell'

// Cure-sequence items (the 4 the current quest tracks) plus the four
// additional Knight Lore inventory items wired for future placement. Adding
// to the union here is enough to spawn one via addPickup — the cure
// sequence in GameState.ts decides which are required for the win.
export type ItemId =
  | 'goblet'
  | 'gem'
  | 'wine-bottle'
  | 'crystal-ball'
  | 'boot'
  | 'teacup'
  | 'poison'
  | 'life'

// Each sprite extracted from strategywiki.org and recoloured white-on-
// transparent. The mono shader tints to the active room's hue.
const SPRITE_URL: Record<ItemId, string> = {
  'goblet': '/sprites/items/goblet.png',
  'gem': '/sprites/items/gem.png',
  'wine-bottle': '/sprites/items/wine-bottle.png',
  'crystal-ball': '/sprites/items/crystal-ball.png',
  'boot': '/sprites/items/boot.png',
  'teacup': '/sprites/items/teacup.png',
  'poison': '/sprites/items/poison.png',
  'life': '/sprites/items/life.png',
}

// World height for a 16-25px sprite. ~0.5m world × 2 group scale wouldn't
// apply here (the sprite is parented to the pickup entity, not the
// character visual group). Picked to read about half a tile tall.
const ITEM_WORLD_HEIGHT = 0.7

// Item billboard: PixelSprite wrapping the strategywiki pixel art.
// Anchored to the pickup's position. Used to also produce a 3D compound
// mesh — the sprite is far closer to the original game art.
export function makeItemMesh(id: ItemId): THREE.Object3D {
  const sprite = new PixelSprite({
    url: SPRITE_URL[id],
    frameCount: 1, // static — one frame
    worldHeight: ITEM_WORLD_HEIGHT,
  })
  return sprite.sprite
}

export function addPickup(room: Room, id: ItemId, gridX: number, gridZ: number, y = 0.4): Pickup {
  const pickup = new Pickup(id)
  pickup.object3D = makeItemMesh(id)
  pickup.position.set(tileCenter(gridX), y, tileCenter(gridZ))
  pickup.renderPosition.copy(pickup.position)
  pickup.object3D.position.copy(pickup.position)
  room.add(pickup)
  return pickup
}
