import { describe, it, expect } from 'vitest'
import { ROOM_SPECS, entryFor, oppositeOf, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { LEGACY_ROOM_LINKS } from '../../src/scenes/rooms/roomSpecs'
import { ALL_ITEMS } from '../../src/game/GameState'

const GRID = 8
const inGrid = (c: { x: number; z: number }) => c.x >= 0 && c.x < GRID && c.z >= 0 && c.z < GRID

function allLinks(): { id: string; exits: { direction: RoomSpec['exits'][number]['direction']; target: string }[] }[] {
  return [
    ...LEGACY_ROOM_LINKS,
    ...ROOM_SPECS.map((s) => ({ id: s.id, exits: s.exits.map((e) => ({ direction: e.direction, target: e.target })) })),
  ]
}

describe('room map', () => {
  it('has unique room ids across legacy rooms and specs', () => {
    const ids = allLinks().map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every exit leads to a room that exists', () => {
    const ids = new Set(allLinks().map((r) => r.id))
    for (const room of allLinks()) for (const e of room.exits) expect(ids.has(e.target), `${room.id} -> ${e.target}`).toBe(true)
  })

  it('every exit is reciprocated by the opposite exit in the target room', () => {
    const byId = new Map(allLinks().map((r) => [r.id, r]))
    for (const room of allLinks()) {
      for (const e of room.exits) {
        const back = byId.get(e.target)!.exits.find((x) => x.direction === oppositeOf(e.direction))
        expect(back?.target, `${room.id} ${e.direction} -> ${e.target} has no way back`).toBe(room.id)
      }
    }
  })

  it('has the cauldron room plus its mapped neighbours', () => {
    expect(ROOM_SPECS.length).toBeGreaterThanOrEqual(8)
    expect(ROOM_SPECS.filter((s) => s.mapped).length).toBeGreaterThanOrEqual(7)
  })

  it('places every item exactly once across the spec rooms', () => {
    const placed = ROOM_SPECS.flatMap((s) => (s.pickups ?? []).map((p) => p.item))
    expect([...placed].sort()).toEqual([...ALL_ITEMS].sort())
  })

  it('gives every hand-authored room at least three placed things', () => {
    for (const s of ROOM_SPECS.filter((r) => !r.mapped)) {
      const count = ['platforms', 'pushBlocks', 'spikes', 'guards', 'ghosts', 'pickups', 'movingPlatforms', 'pathGuards', 'tables', 'vanishing', 'balls']
        .reduce((sum, key) => sum + (((s as unknown as Record<string, unknown[] | undefined>)[key]) ?? []).length, 0)
      expect(count, s.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('has exactly one cauldron room, with the wizard beside the cauldron', () => {
    const withCauldron = ROOM_SPECS.filter((s) => s.cauldron)
    expect(withCauldron).toHaveLength(1)
    const room = withCauldron[0]!
    expect(room.id).toBe('room-001')
    expect(room.wizard).toBeDefined()
    expect(inGrid(room.cauldron!) && inGrid(room.wizard!)).toBe(true)
  })

})

describe('entryFor', () => {
  it('drops the player just inside the edge opposite to the door walked through', () => {
    expect(entryFor('south')).toEqual({ x: 8, z: 1 })
    expect(entryFor('north')).toEqual({ x: 8, z: 15 })
    expect(entryFor('east')).toEqual({ x: 1, z: 8 })
    expect(entryFor('west')).toEqual({ x: 15, z: 8 })
  })
})

describe('room specs content', () => {
  it('keeps every placed cell inside the grid', () => {
    for (const s of ROOM_SPECS) {
      for (const p of s.platforms ?? []) expect(inGrid(p), `${s.id} platform`).toBe(true)
      for (const p of s.pushBlocks ?? []) expect(inGrid(p), `${s.id} push block`).toBe(true)
      for (const p of s.spikes ?? []) expect(inGrid(p), `${s.id} spike`).toBe(true)
      for (const p of s.pickups ?? []) expect(inGrid(p), `${s.id} pickup`).toBe(true)
      for (const p of s.movingPlatforms ?? []) {
        expect(inGrid(p.from) && inGrid(p.to), `${s.id} platform path`).toBe(true)
        expect(p.from.x === p.to.x || p.from.z === p.to.z, `${s.id} platform must move along one axis`).toBe(true)
      }
      for (const g of s.pathGuards ?? []) for (const c of g.path) expect(inGrid(c), `${s.id} guard path`).toBe(true)
      for (const t of s.tables ?? []) expect(inGrid(t), `${s.id} table`).toBe(true)
      for (const v of s.vanishing ?? []) expect(inGrid(v), `${s.id} vanishing block`).toBe(true)
      for (const b of s.balls ?? []) expect(inGrid(b.from) && inGrid(b.to), `${s.id} ball path`).toBe(true)
      for (const f of s.flames ?? []) expect(inGrid(f), `${s.id} flame`).toBe(true)
      expect(inGrid(s.spawn), `${s.id} spawn`).toBe(true)
    }
  })

  it('never spawns the player on a solid or a spike', () => {
    for (const s of ROOM_SPECS) {
      const solids = [...(s.platforms ?? []), ...(s.pushBlocks ?? []), ...(s.spikes ?? [])]
      expect(solids.some((c) => c.x === s.spawn.x && c.z === s.spawn.z), s.id).toBe(false)
    }
  })

  it('puts a pickup that sits on a platform on top of it, never inside it', () => {
    for (const s of ROOM_SPECS) {
      for (const p of s.pickups ?? []) {
        const under = (s.platforms ?? []).find((c) => c.x === p.x && c.z === p.z)
        if (under) expect(p.y ?? 0, `${s.id} ${p.item} is inside a platform`).toBeGreaterThanOrEqual(under.height)
      }
    }
  })

  it('keeps guard and ball paths away from the doorways, so entering a room is never a death', () => {
    const doorCell = { north: { x: 4, z: 0 }, south: { x: 4, z: 7 }, west: { x: 0, z: 4 }, east: { x: 7, z: 4 } }
    const near = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.z - b.z) <= 1
    for (const s of ROOM_SPECS) {
      const doors = s.exits.map((e) => doorCell[e.direction])
      const points = [...(s.pathGuards ?? []).flatMap((g) => g.path), ...(s.balls ?? []).flatMap((b) => [b.from, b.to]), ...(s.guards ?? []).flatMap((g) => [g.from, g.to])]
      for (const p of points) for (const d of doors) expect(near(p, d), `${s.id} path point ${p.x},${p.z} sits on the ${JSON.stringify(d)} door`).toBe(false)
    }
  })

  it('keeps spikes at least a cell away from every doorway', () => {
    const doorCell = { north: { x: 4, z: 0 }, south: { x: 4, z: 7 }, west: { x: 0, z: 4 }, east: { x: 7, z: 4 } }
    for (const s of ROOM_SPECS) {
      for (const e of s.exits) {
        const d = doorCell[e.direction]
        for (const sp of s.spikes ?? []) expect(Math.abs(sp.x - d.x) <= 1 && Math.abs(sp.z - d.z) <= 1, `${s.id} spike at ${sp.x},${sp.z} by the ${e.direction} door`).toBe(false)
      }
    }
  })

  it('keeps the doorway cells clear so every exit can be reached', () => {
    const doorCell = { north: { x: 4, z: 0 }, south: { x: 4, z: 7 }, west: { x: 0, z: 4 }, east: { x: 7, z: 4 } }
    for (const s of ROOM_SPECS) {
      const solids = [...(s.platforms ?? []), ...(s.pushBlocks ?? []), ...(s.spikes ?? [])]
      for (const e of s.exits) {
        const d = doorCell[e.direction]
        expect(solids.some((c) => c.x === d.x && c.z === d.z), `${s.id} ${e.direction} door blocked`).toBe(false)
      }
    }
  })
})
