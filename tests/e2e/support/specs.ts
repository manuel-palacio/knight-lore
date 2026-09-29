import { ROOM_SPECS, type RoomSpec } from '../../../src/scenes/rooms/roomSpecs'

export function specById(id: string): RoomSpec {
  const spec = ROOM_SPECS.find((s) => s.id === id)
  if (!spec) throw new Error(`no room ${id}`)
  return spec
}
