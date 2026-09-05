import { Pickup } from '../../game/Pickup'
import type { Room } from '../../game/Room'
import { tileCenter } from './shell'

export type { ItemId } from '../../game/GameState'
import type { ItemId } from '../../game/GameState'

export function addPickup(room: Room, id: ItemId, gridX: number, gridZ: number, y = 0.4): Pickup {
  const pickup = new Pickup(id)
  pickup.position.set(tileCenter(gridX), y, tileCenter(gridZ))
  room.add(pickup)
  return pickup
}
