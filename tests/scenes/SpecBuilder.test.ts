import { describe, it, expect } from 'vitest'
import { buildRoomFromSpec } from '../../src/scenes/rooms/specBuilder'
import { GameState, itemAtSpot } from '../../src/game/GameState'
import { CHARM_HOVER, Pickup } from '../../src/game/Pickup'
import { tileCenter } from '../../src/scenes/rooms/shell'
import type { RoomSpec } from '../../src/scenes/rooms/roomSpecs'

// A room with one of the castle's charm spots, number 26, on a block 4 high.
const spotRoom: RoomSpec = {
  id: 'spot-room', tint: 'green',
  exits: [],
  spawn: { x: 4, z: 1 },
  charmSpots: [{ spot: 26, x: 3, z: 3, height: 4 }],
}

function pickupsIn(entities: unknown[]): Pickup[] {
  return entities.filter((e): e is Pickup => e instanceof Pickup)
}

describe('buildRoomFromSpec', () => {
  it('lays at a charm spot what the deal gives it, lying on what is there', async () => {
    const state = new GameState(1)
    const [charm] = pickupsIn((await buildRoomFromSpec(spotRoom)(state)).entities)
    expect(charm?.id).toBe(itemAtSpot(26, state.charmDeal))
    expect(charm?.spot).toBe(26)
    expect(charm?.position.toArray()).toEqual([tileCenter(3), 4 + CHARM_HOVER, tileCenter(3)])
  })

  it('leaves a spot empty once its charm was delivered or its extra life taken', async () => {
    const state = new GameState(1)
    state.usedSpots.push(26)
    expect(pickupsIn((await buildRoomFromSpec(spotRoom)(state)).entities)).toEqual([])
  })

  it('lays the charms a spec gives whatever the deal, belonging to no spot', async () => {
    const [boot] = pickupsIn((await buildRoomFromSpec({ ...spotRoom, charmSpots: [], pickups: [{ x: 3, z: 3, item: 'boot' }] })(new GameState(1))).entities)
    expect(boot?.id).toBe('boot')
    expect(boot?.spot).toBeNull()
  })
})
