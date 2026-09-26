import { describe, it, expect } from 'vitest'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'

// Rooms generated from the original's room table (tools/rip/castle.py),
// checked against what the original is known to hold.
const room = (id: string) => ROOM_SPECS.find((s) => s.id === id)!
const cells = (list: { x: number; z: number }[] = []) => list.map((c) => `${c.x},${c.z}`).sort()

describe('rooms from the original room table', () => {
  it('the cauldron room (0x88): four doors, eight blocks in a ring, the cauldron and the wizard', () => {
    const cauldron = room('room-001')
    expect(cauldron.exits.map((e) => e.direction).sort()).toEqual(['east', 'north', 'south', 'west'])
    expect(cells(cauldron.platforms)).toEqual(['1,2', '1,5', '2,1', '2,6', '5,1', '5,6', '6,2', '6,5'])
    expect(cauldron.platforms!.every((p) => p.height === 1)).toBe(true)
    expect(cauldron.cauldron).toEqual({ x: 4, z: 4, height: 0 })
  })

  it('the cage (0x87, west of the cauldron): spiked blocks at the corners, grilles between them', () => {
    const cage = room('map--1-0')
    expect(cells(cage.platforms)).toEqual(['2,2', '2,5', '5,2', '5,5'])
    expect(cells(cage.spikes)).toEqual(['2,2', '2,5', '5,2', '5,5'])
    expect(cage.spikes!.every((s) => s.height === 1)).toBe(true)
    expect(cage.portcullises).toHaveLength(4)
    expect(cage.exits.find((e) => e.direction === 'east')?.target).toBe('room-001')
  })

  it('a narrow corridor (0x67): four cells across, a grille and a guard across it', () => {
    const corridor = room('map--1--2')
    expect(corridor.width).toBe(4)
    expect(corridor.portcullises).toEqual([{ from: { x: 0, z: 5 }, to: { x: 3, z: 5 } }])
    expect(corridor.pathGuards).toHaveLength(1)
  })

  it('the four start rooms are empty, as the original starts Sabreman in a quiet room', () => {
    for (const id of ['map-7--6', 'map--4--4', 'map--5-3', 'map-7-0']) {
      const start = room(id)
      expect(start.platforms, id).toEqual([])
      expect(start.spikes ?? [], id).toEqual([])
    }
  })
})
