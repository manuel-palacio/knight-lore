import { Room } from '../../game/Room'
import { StaticBlock } from '../../game/StaticBlock'
import { PatrolEnemy } from '../../game/PatrolEnemy'

export const TILE = 2

export function tileCenter(cell: number): number {
  return cell * TILE + TILE / 2
}

// Per-room colour: each Knight Lore room had one dominant ZX Spectrum hue.
export type RoomTint = 'yellow' | 'blue' | 'cyan' | 'green' | 'purple' | 'red'

// The four the castle uses are the original's, as the emulator shows them.
const TINT_RGB: Record<RoomTint, number> = {
  yellow: 0xffff55,
  blue: 0x4080c0,
  cyan: 0x75fbfd,
  green: 0x75fb4c,
  purple: 0xea33f6,
  red: 0xc04050,
}

export function buildRoomShell(id: string, tint: RoomTint = 'yellow', width = 8, depth = 8): Room {
  const room = new Room(id, width, depth)
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
