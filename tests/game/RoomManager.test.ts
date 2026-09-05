import { describe, it, expect } from 'vitest'
import { RoomManager, type RoomBuilder } from '../../src/game/RoomManager'
import { Room } from '../../src/game/Room'
import { Pickup } from '../../src/game/Pickup'
import { GameState } from '../../src/game/GameState'

function makeManager() {
  const state = new GameState()
  let buildsA = 0
  const builders = new Map<string, RoomBuilder>([
    ['room-a', async () => {
      buildsA++
      const r = new Room('room-a', 8, 8)
      r.addExit({ direction: 'south', targetRoomId: 'room-b', entryX: 8, entryZ: 1 })
      r.add(new Pickup('gem'))
      return r
    }],
    ['room-b', async () => new Room('room-b', 8, 8)],
  ])
  const manager = new RoomManager(builders, state)
  return { state, manager, builds: () => buildsA }
}

describe('RoomManager', () => {
  it('builds lazily, sets currentRoomId and entry spawn', async () => {
    const { state, manager } = makeManager()
    const room = await manager.transitionTo('room-a', 8, 14)
    expect(state.currentRoomId).toBe('room-a')
    expect(room.spawnX).toBe(8)
    expect(room.spawnZ).toBe(14)
    expect(manager.active).toBe(room)
  })

  it('swaps the active room and reuses cached rooms with their state', async () => {
    const { manager, builds } = makeManager()
    const a = await manager.transitionTo('room-a', 8, 14)
    const pickup = a.entities.find((e) => e instanceof Pickup) as Pickup
    pickup.collect()
    const b = await manager.transitionTo('room-b', 8, 1)
    expect(manager.active).toBe(b)
    const aAgain = await manager.transitionTo('room-a', 1, 8)
    expect(aAgain).toBe(a)
    expect(builds()).toBe(1)
    expect((aAgain.entities.find((e) => e instanceof Pickup) as Pickup).collected).toBe(true)
  })

  it('throws on unknown room ids', async () => {
    const { manager } = makeManager()
    await expect(manager.transitionTo('nope', 0, 0)).rejects.toThrow('Unknown room')
  })

  it('exitAt fires only past the matching edge threshold', async () => {
    const { manager } = makeManager()
    await manager.transitionTo('room-a', 8, 14)
    expect(manager.exitAt(8, 14)).toBeNull()
    expect(manager.exitAt(8, 15.6)?.targetRoomId).toBe('room-b') // south edge
    expect(manager.exitAt(8, 0.3)).toBeNull() // north edge has no exit
    expect(manager.exitAt(0.3, 8)).toBeNull()
  })
})
