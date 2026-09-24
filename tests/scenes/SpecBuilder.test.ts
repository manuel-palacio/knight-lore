import { describe, it, expect } from 'vitest'
import { buildRoomFromSpec } from '../../src/scenes/rooms/specBuilder'
import { GameState } from '../../src/game/GameState'
import { Pickup } from '../../src/game/Pickup'
import { ROOM_SPECS, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'

const charmRoom: RoomSpec = {
  id: 'test-room', tint: 'green',
  exits: [],
  spawn: { x: 4, z: 1 },
  pickups: [{ x: 3, z: 3, item: 'boot' }],
}

function pickupsIn(entities: unknown[]): string[] {
  return entities.filter((e): e is Pickup => e instanceof Pickup).map((p) => p.id)
}

describe('buildRoomFromSpec', () => {
  it('places the charms of a room', async () => {
    const room = await buildRoomFromSpec(charmRoom)(new GameState(1))
    expect(pickupsIn(room.entities)).toEqual(['boot'])
  })

  it('leaves out charms already delivered to the cauldron, so a continued game does not bring them back', async () => {
    const state = new GameState(1)
    const rest = state.cureSequence.filter((i) => i !== 'boot')
    state.apply({ ...state.serialize(), cureSequence: ['boot', 'boot', ...rest], cureProgress: 2 })
    const room = await buildRoomFromSpec(charmRoom)(state)
    expect(pickupsIn(room.entities)).toEqual([])
  })

  it('with one of a kind delivered, leaves the first copy out and keeps the second', async () => {
    const [first, second] = ROOM_SPECS.filter((r) => r.pickups?.some((p) => p.item === 'boot'))
    const state = new GameState(1)
    const rest = state.cureSequence.filter((i) => i !== 'boot')
    state.apply({ ...state.serialize(), cureSequence: ['boot', ...rest.slice(0, 6), 'boot', ...rest.slice(6)], cureProgress: 1 })
    expect(pickupsIn((await buildRoomFromSpec(first!)(state)).entities)).toEqual([])
    expect(pickupsIn((await buildRoomFromSpec(second!)(state)).entities)).toEqual(['boot'])
  })
})
