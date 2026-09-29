import type { RoomBuilder } from '../../game/RoomManager'
import { ROOM_SPECS, START_ROOMS } from './roomSpecs'
import { FULL_ROOM_CELLS } from '../../engine/OriginalPixels'
import { buildRoomFromSpec } from './specBuilder'

const SIZES = new Map(ROOM_SPECS.map((s) => [s.id, { width: s.width ?? FULL_ROOM_CELLS, depth: s.depth ?? FULL_ROOM_CELLS }]))
const sizeOf = (id: string) => SIZES.get(id) ?? { width: FULL_ROOM_CELLS, depth: FULL_ROOM_CELLS }

export const ROOM_BUILDERS = new Map<string, RoomBuilder>([
  ...ROOM_SPECS.map((spec) => [spec.id, buildRoomFromSpec(spec, sizeOf)] as const),
])

// The original starts Sabreman in one of four rooms, chosen at random.
export function pickStartRoom(random: number): string {
  return START_ROOMS[Math.min(START_ROOMS.length - 1, Math.floor(random * START_ROOMS.length))]!
}
