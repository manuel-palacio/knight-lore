import type { RoomBuilder } from '../../game/RoomManager'
import { FULL_SIZE, ROOM_SPECS, START_ROOMS } from './roomSpecs'
import { buildRoomFromSpec } from './specBuilder'

const SIZES = new Map(ROOM_SPECS.map((s) => [s.id, { width: s.width ?? FULL_SIZE, depth: s.depth ?? FULL_SIZE }]))
const sizeOf = (id: string) => SIZES.get(id) ?? { width: FULL_SIZE, depth: FULL_SIZE }

export const ROOM_BUILDERS = new Map<string, RoomBuilder>([
  ...ROOM_SPECS.map((spec) => [spec.id, buildRoomFromSpec(spec, sizeOf)] as const),
])

// The original starts Sabreman in one of four rooms, chosen at random.
export function pickStartRoom(random: number): string {
  return START_ROOMS[Math.min(START_ROOMS.length - 1, Math.floor(random * START_ROOMS.length))]!
}
