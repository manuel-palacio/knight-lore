import { describe, it, expect } from 'vitest'
import { buildRoomFromSpec } from '../../src/scenes/rooms/specBuilder'
import { GameState } from '../../src/game/GameState'
import { Pickup } from '../../src/game/Pickup'
import type { RoomSpec } from '../../src/scenes/rooms/roomSpecs'

const firstBootRoom: RoomSpec = {
  id: 'first-boot-room', tint: 'green',
  exits: [],
  spawn: { x: 4, z: 1 },
  pickups: [{ x: 3, z: 3, item: 'boot' }],
}

function pickupsIn(entities: unknown[]): Pickup[] {
  return entities.filter((e): e is Pickup => e instanceof Pickup)
}

const lifeRoom: RoomSpec = { ...firstBootRoom, id: 'life-room', pickups: [{ x: 3, z: 3, item: 'life' }] }

describe('buildRoomFromSpec', () => {
  it('leaves out an extra life already taken', async () => {
    const state = new GameState(1)
    state.emptiedRooms.push('life-room')
    expect(pickupsIn((await buildRoomFromSpec(lifeRoom)(state)).entities)).toEqual([])
  })

  it('places the charm of a room, remembering the room as its home', async () => {
    const [boot] = pickupsIn((await buildRoomFromSpec(firstBootRoom)(new GameState(1))).entities)
    expect(boot?.id).toBe('boot')
    expect(boot?.homeRoomId).toBe('first-boot-room')
  })

  it('leaves out a charm already delivered from this room, so a continued game does not bring it back', async () => {
    const state = new GameState(1)
    state.emptiedRooms.push('first-boot-room')
    expect(pickupsIn((await buildRoomFromSpec(firstBootRoom)(state)).entities)).toEqual([])
  })

  it('keeps its charm when the other copy of the kind was the one delivered', async () => {
    const state = new GameState(1)
    state.emptiedRooms.push('second-boot-room')
    const rest = state.cureSequence.filter((i) => i !== 'boot')
    state.apply({ ...state.serialize(), cureSequence: ['boot', ...rest.slice(0, 6), 'boot', ...rest.slice(6)], cureProgress: 1 })
    expect(pickupsIn((await buildRoomFromSpec(firstBootRoom)(state)).entities).map((p) => p.id)).toEqual(['boot'])
  })
})
