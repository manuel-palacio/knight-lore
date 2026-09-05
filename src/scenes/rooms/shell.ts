import { Room } from '../../game/Room'
import { StaticBlock } from '../../game/StaticBlock'
import { PushBlock } from '../../game/PushBlock'
import { PatrolEnemy } from '../../game/PatrolEnemy'

export const TILE = 2

export function tileCenter(cell: number): number {
  return cell * TILE + TILE / 2
}

// Per-room colour: each Knight Lore room had one dominant ZX Spectrum hue.
export type RoomTint = 'yellow' | 'blue' | 'green' | 'purple' | 'red'

const TINT_RGB: Record<RoomTint, number> = {
  yellow: 0xffc060,
  blue: 0x4080c0,
  green: 0x40b070,
  purple: 0xa050c0,
  red: 0xc04050,
}

export function buildRoomShell(id: string, tint: RoomTint = 'yellow'): Room {
  const room = new Room(id, 8, 8)
  room.tint = TINT_RGB[tint]
  return room
}

export function addPlatform(room: Room, gridX: number, gridZ: number, height: number): void {
  const block = new StaticBlock(gridX, gridZ, height)
  block.placeOnGrid(room.grid, TILE)
  room.add(block)
}

export function addPatrolEnemy(
  room: Room,
  a: { x: number; z: number },
  b: { x: number; z: number },
  speed?: number,
): PatrolEnemy {
  const enemy = new PatrolEnemy(a, b, speed)
  room.add(enemy)
  return enemy
}

// 1.0 high so a 1.0 jump can climb it.
export function addPushBlock(room: Room, gridX: number, gridZ: number): void {
  const block = new PushBlock(gridX, gridZ)
  block.placeOnGrid(room.grid, TILE)
  room.add(block)
}
