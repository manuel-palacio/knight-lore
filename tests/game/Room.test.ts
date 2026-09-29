import { describe, it, expect } from 'vitest'
import { Room } from '../../src/game/Room'
import { FallingBlock } from '../../src/game/FallingBlock'
import { Pickup, CHARM_HOVER } from '../../src/game/Pickup'
import { MovingPlatform } from '../../src/game/MovingPlatform'
import { PathGuard } from '../../src/game/PathGuard'
import { TICKS_PER_FRAME } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'

describe('Room', () => {
  it('stores declared exits', () => {
    const room = new Room('r', 8, 8)
    room.addExit({ direction: 'south', targetRoomId: 'other', entryX: 8, entryZ: 1 })
    expect(room.exits).toHaveLength(1)
    expect(room.exits[0]!.targetRoomId).toBe('other')
  })

  it('remove() detaches the entity', () => {
    const room = new Room('r', 8, 8)
    const p = new Pickup('gem')
    room.add(p)
    expect(room.entities).toContain(p)
    room.remove(p)
    expect(room.entities).not.toContain(p)
  })

  it('reset() returns platforms and guards to where they started', () => {
    const room = new Room('r', 8, 8)
    const platform = new MovingPlatform({ x: 3, z: 5 }, { x: 9, z: 5 }, 1)
    const guard = new PathGuard([{ x: 3, z: 3 }, { x: 7, z: 3 }, { x: 7, z: 7 }])
    room.add(platform)
    room.add(guard)
    for (let i = 0; i < TICKS_PER_FRAME * 10; i++) room.update(SIMULATION_DT, {})
    expect(platform.position.x).not.toBe(3)
    expect(guard.position.x).not.toBe(3)
    room.reset()
    expect(platform.position.x).toBe(3)
    expect(guard.position.x).toBe(3)
    expect(guard.position.z).toBe(3)
    expect(guard.facing).toBe('east')
  })

  it('lifts a charm out of a block that comes back around it when the room starts afresh', () => {
    const room = new Room('test', 8, 8)
    const block = new FallingBlock(2, 2, 2, 2) // top at 2 in cell (2, 2)
    room.add(block)
    block.topPx = 12 // it sank a level, its top at 1
    const charm = new Pickup('gem')
    charm.position.set(5, 1 + CHARM_HOVER, 5) // put down on it there
    room.add(charm)
    room.reset()
    expect(charm.position.y).toBeCloseTo(2 + CHARM_HOVER, 9)
  })
})
