import type { RoomBuilder } from '../../game/RoomManager'
import { ROOM_SPECS } from './roomSpecs'
import { buildRoomFromSpec } from './specBuilder'

export const ROOM_BUILDERS = new Map<string, RoomBuilder>([
  ...ROOM_SPECS.map((spec) => [spec.id, buildRoomFromSpec(spec)] as const),
])

export const START_ROOM = 'map--4-4'
