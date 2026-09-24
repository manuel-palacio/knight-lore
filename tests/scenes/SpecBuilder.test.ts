import { describe, it, expect } from 'vitest'
import { buildRoomFromSpec } from '../../src/scenes/rooms/specBuilder'
import { GameState } from '../../src/game/GameState'
import { Pickup } from '../../src/game/Pickup'
import type { RoomSpec } from '../../src/scenes/rooms/roomSpecs'

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
    state.apply({ ...state.serialize(), cureSequence: ['boot', ...state.cureSequence.filter((i) => i !== 'boot')], cureProgress: 1 })
    const room = await buildRoomFromSpec(charmRoom)(state)
    expect(pickupsIn(room.entities)).toEqual([])
  })
})
