import { describe, it, expect } from 'vitest'
import { Room } from '../../src/game/Room'
import { Pickup } from '../../src/game/Pickup'
import { PatrolEnemy } from '../../src/game/PatrolEnemy'

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

  it('patrol enemy honors a custom speed', () => {
    const slow = new PatrolEnemy({ x: 0, z: 0 }, { x: 10, z: 0 }, 0.5)
    slow.update(1, {})
    expect(slow.position.x).toBeCloseTo(0.5, 5)
    const normal = new PatrolEnemy({ x: 0, z: 0 }, { x: 10, z: 0 })
    normal.update(1, {})
    expect(normal.position.x).toBeCloseTo(1.6, 5)
  })
})
