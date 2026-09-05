import { describe, it, expect } from 'vitest'
import { ROOM_SPECS, entryFor, oppositeOf, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { LEGACY_ROOM_LINKS } from '../../src/scenes/rooms/roomSpecs'

const GRID = 8

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

  it('adds at least eight rooms to the original five', () => {
    expect(ROOM_SPECS.length).toBeGreaterThanOrEqual(8)
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
  const inGrid = (c: { x: number; z: number }) => c.x >= 0 && c.x < GRID && c.z >= 0 && c.z < GRID

  it('keeps every placed cell inside the grid', () => {
    for (const s of ROOM_SPECS) {
      for (const p of s.platforms ?? []) expect(inGrid(p), `${s.id} platform`).toBe(true)
      for (const p of s.pushBlocks ?? []) expect(inGrid(p), `${s.id} push block`).toBe(true)
      for (const p of s.spikes ?? []) expect(inGrid(p), `${s.id} spike`).toBe(true)
      for (const p of s.pickups ?? []) expect(inGrid(p), `${s.id} pickup`).toBe(true)
      expect(inGrid(s.spawn), `${s.id} spawn`).toBe(true)
    }
  })

  it('never spawns the player on a solid or a spike', () => {
    for (const s of ROOM_SPECS) {
      const solids = [...(s.platforms ?? []), ...(s.pushBlocks ?? []), ...(s.spikes ?? [])]
      expect(solids.some((c) => c.x === s.spawn.x && c.z === s.spawn.z), s.id).toBe(false)
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
