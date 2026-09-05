import { Pickup } from '../../game/Pickup'
import type { Room } from '../../game/Room'
import { tileCenter } from './shell'

// Cure-sequence items plus the four extra Knight Lore inventory items. The
// cure sequence in GameState.ts decides which are required for the win.
// Sprites live in public/sprites/items/<id>.png.
export type ItemId =
  | 'goblet'
  | 'gem'
  | 'wine-bottle'
  | 'crystal-ball'
  | 'boot'
  | 'teacup'
  | 'poison'
  | 'life'

export function addPickup(room: Room, id: ItemId, gridX: number, gridZ: number, y = 0.4): Pickup {
  const pickup = new Pickup(id)
  pickup.position.set(tileCenter(gridX), y, tileCenter(gridZ))
  room.add(pickup)
  return pickup
}
