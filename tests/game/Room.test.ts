import { describe, it, expect } from 'vitest'
import { Room } from '../../src/game/Room'
import { Pickup } from '../../src/game/Pickup'
import { PatrolEnemy } from '../../src/game/PatrolEnemy'
import { MovingPlatform } from '../../src/game/MovingPlatform'
import { PathGuard } from '../../src/game/PathGuard'
import { TICKS_PER_STEP } from '../../src/engine/StepClock'
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
    for (let i = 0; i < TICKS_PER_STEP * 10; i++) room.update(SIMULATION_DT, {})
    expect(platform.position.x).not.toBe(3)
    expect(guard.position.x).not.toBe(3)
    room.reset()
    expect(platform.position.x).toBe(3)
    expect(guard.position.x).toBe(3)
    expect(guard.position.z).toBe(3)
    expect(guard.facing).toBe('east')
  })

  it('patrol enemy honors a custom speed', () => {
    const slow = new PatrolEnemy({ x: 0, z: 0 }, { x: 10, z: 0 }, 0.5)
    slow.update(1, {})
    expect(slow.position.x).toBeCloseTo(0.5, 5)
    const normal = new PatrolEnemy({ x: 0, z: 0 }, { x: 10, z: 0 })
    normal.update(1, {})
    expect(normal.position.x).toBeCloseTo(1.6, 5)
  })
})
