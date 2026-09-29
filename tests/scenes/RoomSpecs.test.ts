import { describe, it, expect } from 'vitest'
import { ROOM_SPECS, START_ROOMS, doorCell, entryFor, oppositeOf, type Cell, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { DEALT_ITEMS, itemAtSpot } from '../../src/game/GameState'
import { coveredCells, findFloorPath } from '../e2e/support/roomPath'
import { SOLVED_PUZZLES } from '../e2e/support/puzzles'
import { pickStartRoom } from '../../src/scenes/rooms/index'

const widthOf = (s: RoomSpec) => s.width ?? 8
const depthOf = (s: RoomSpec) => s.depth ?? 8
const inRoom = (s: RoomSpec, c: Cell) => c.x >= 0 && c.x < widthOf(s) && c.z >= 0 && c.z < depthOf(s)
const doorsOf = (s: RoomSpec) => s.exits.map((e) => ({ direction: e.direction, cell: doorCell(e.direction, widthOf(s), depthOf(s)) }))
const beside = (a: Cell, b: Cell) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.z - b.z) <= 1
const walks = (s: RoomSpec, a: Cell, b: Cell) => {
  try {
    findFloorPath(s, a, b)
    return true
  } catch {
    return false
  }
}

function roomDistancesFrom(origin: string): Map<string, number> {
  const byId = new Map(ROOM_SPECS.map((s) => [s.id, s]))
  const distance = new Map([[origin, 0]])
  const queue = [origin]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const e of byId.get(id)!.exits) {
      if (distance.has(e.target)) continue
      distance.set(e.target, distance.get(id)! + 1)
      queue.push(e.target)
    }
  }
  return distance
}

describe('the castle', () => {
  it('has all 128 rooms of the original, each once', () => {
    const ids = ROOM_SPECS.map((s) => s.id)
    expect(ids).toHaveLength(128)
    expect(new Set(ids).size).toBe(128)
  })

  it('reaches every room from the cauldron', () => {
    expect(roomDistancesFrom('room-001').size).toBe(ROOM_SPECS.length)
  })

  it('every exit is reciprocated by the opposite exit in the target room', () => {
    const byId = new Map(ROOM_SPECS.map((r) => [r.id, r]))
    for (const room of ROOM_SPECS) {
      for (const e of room.exits) {
        const back = byId.get(e.target)?.exits.find((x) => x.direction === oppositeOf(e.direction))
        expect(back?.target, `${room.id} ${e.direction} -> ${e.target} has no way back`).toBe(room.id)
      }
    }
  })

  it('starts in one of the original four start rooms', () => {
    expect(START_ROOMS).toEqual(['map-7--6', 'map--4--4', 'map--5-3', 'map-7-0'])
    for (const id of START_ROOMS) expect(ROOM_SPECS.some((s) => s.id === id), id).toBe(true)
  })

  it('has narrow rooms, four cells across one axis, as the original', () => {
    const narrow = ROOM_SPECS.filter((s) => widthOf(s) === 4 || depthOf(s) === 4)
    expect(narrow.length).toBeGreaterThan(40)
  })

  it('has the original\'s 32 charm spots (0x6FF2), each once, at most one to a room', () => {
    const spots = ROOM_SPECS.flatMap((r) => (r.charmSpots ?? []).map((c) => c.spot)).sort((a, b) => a - b)
    expect(spots).toEqual(Array.from({ length: 32 }, (_, i) => i))
    for (const r of ROOM_SPECS) expect((r.charmSpots ?? []).length, r.id).toBeLessThanOrEqual(1)
  })

  it('deals four of each kind round the spots, the seven charms and the extra life, whatever the start', () => {
    const spots = ROOM_SPECS.flatMap((r) => (r.charmSpots ?? []).map((c) => c.spot))
    for (let deal = 0; deal < 8; deal++) {
      const dealt = spots.map((spot) => itemAtSpot(spot, deal))
      for (const item of DEALT_ITEMS) expect(dealt.filter((i) => i === item), `${item} in deal ${deal}`).toHaveLength(4)
    }
  })

  it('puts every door where the original draws its arch or gate, on the same wall', () => {
    // Arch and gate halves (graphics 2-5, and 7, a narrow room's lintel) at the
    // original's edges: x under 0x48 west, over 0xB8 east; y over 0xB8 our north, under 0x48 our south.
    const wallOf = (p: { x: number; y: number }) => (p.x < 0x48 ? 'west' : p.x > 0xb8 ? 'east' : p.y > 0xb8 ? 'north' : p.y < 0x48 ? 'south' : null)
    for (const r of ROOM_SPECS) {
      const arched = new Set((r.backdrop ?? []).filter((p) => [2, 3, 4, 5, 7].includes(p.graphic)).map(wallOf))
      for (const e of r.exits) expect(arched.has(e.direction), `${r.id} ${e.direction} door`).toBe(true)
    }
  })

  it('has exactly one cauldron room, with the wizard beside the cauldron', () => {
    const withCauldron = ROOM_SPECS.filter((s) => s.cauldron)
    expect(withCauldron).toHaveLength(1)
    const room = withCauldron[0]!
    expect(room.id).toBe('room-001')
    expect(room.wizard).toBeDefined()
    expect(inRoom(room, room.cauldron!) && inRoom(room, room.wizard!)).toBe(true)
  })
})

describe('winning on foot', () => {
  // Rooms reached from a start room entering by a door and leaving by any door
  // reachable from it, never solving a puzzle.
  function roomsOnFoot(start: string): Set<string> {
    const byId = new Map(ROOM_SPECS.map((s) => [s.id, s]))
    const seen = new Set<string>()
    const entered = new Set([start])
    const queue: { id: string; door: Cell | null }[] = [{ id: start, door: null }]
    while (queue.length > 0) {
      const { id, door } = queue.shift()!
      const spec = byId.get(id)!
      for (const e of spec.exits) {
        const leave = doorCell(e.direction, widthOf(spec), depthOf(spec))
        if (door && !walks(spec, door, leave)) continue
        const target = byId.get(e.target)!
        const arrive = doorCell(oppositeOf(e.direction), widthOf(target), depthOf(target))
        const state = `${e.target}@${arrive.x},${arrive.z}`
        if (seen.has(state)) continue
        seen.add(state)
        entered.add(e.target)
        queue.push({ id: e.target, door: arrive })
      }
    }
    return entered
  }

  it('reaches the cauldron from each start room without solving a puzzle', () => {
    for (const start of START_ROOMS) expect(roomsOnFoot(start).has('room-001'), `cauldron from ${start}`).toBe(true)
  })
})

describe('door geometry', () => {
  it('drops the player on the door axis of a narrow room too', () => {
    expect(entryFor('south', 4, 8)).toEqual({ x: 4, z: 1 })
    expect(entryFor('west', 8, 4)).toEqual({ x: 15, z: 4 })
    expect(entryFor('north', 4, 8)).toEqual({ x: 4, z: 15 })
  })

  it('puts the door cells mid-edge of the room, whatever its size', () => {
    expect(doorCell('north', 8, 8)).toEqual({ x: 4, z: 0 })
    expect(doorCell('south', 4, 8)).toEqual({ x: 2, z: 7 })
    expect(doorCell('east', 8, 4)).toEqual({ x: 7, z: 2 })
  })

  it('drops the player just inside the edge opposite to the door walked through, on the door axis', () => {
    expect(entryFor('south')).toEqual({ x: 8, z: 1 })
    expect(entryFor('north')).toEqual({ x: 8, z: 15 })
    expect(entryFor('east')).toEqual({ x: 1, z: 8 })
    expect(entryFor('west')).toEqual({ x: 15, z: 8 })
  })
})

describe('room contents', () => {
  it('keeps every placed cell inside its room', () => {
    for (const s of ROOM_SPECS) {
      const cells: Cell[] = [
        ...(s.platforms ?? []), ...(s.boxes ?? []), ...(s.spikes ?? []), ...(s.pickups ?? []), ...(s.charmSpots ?? []),
        ...(s.vanishing ?? []), ...(s.fallingBlocks ?? []), ...(s.flames ?? []), ...(s.ghosts ?? []), ...(s.spikedBalls ?? []),
        ...(s.hoppers ?? []), s.spawn,
        ...(s.movingPlatforms ?? []).flatMap((p) => [p.from, p.to]),
        ...(s.pathGuards ?? []).flatMap((g) => g.path.flatMap(coveredCells)),
        ...(s.balls ?? []).flatMap(coveredCells),
        ...(s.portcullises ?? []).flatMap((p) => [p.from, p.to]),
      ]
      for (const c of cells) expect(inRoom(s, c), `${s.id} ${JSON.stringify(c)}`).toBe(true)
    }
  })

  it('moves along one axis, for moving blocks and gates', () => {
    for (const s of ROOM_SPECS) {
      for (const p of [...(s.movingPlatforms ?? []), ...(s.portcullises ?? [])]) {
        expect(p.from.x === p.to.x || p.from.z === p.to.z, `${s.id} ${JSON.stringify(p)}`).toBe(true)
      }
    }
  })

  it('never spawns the player on a solid or a spike', () => {
    for (const s of ROOM_SPECS) {
      const solids = [...(s.platforms ?? []), ...(s.boxes ?? []), ...(s.spikes ?? [])]
      expect(solids.some((c) => c.x === s.spawn.x && c.z === s.spawn.z), s.id).toBe(false)
    }
  })

  it('lays each charm spot on the floor or on top of what stands in its cell, as the original\'s table has it', () => {
    // Spot 6, in map-5-0, the table puts a level above the top of its stack.
    const ABOVE_ITS_STACK = [6]
    for (const s of ROOM_SPECS) {
      for (const c of s.charmSpots ?? []) {
        if (ABOVE_ITS_STACK.includes(c.spot)) continue
        const here = (b: Cell) => b.x === Math.floor(c.x) && b.z === Math.floor(c.z)
        const tops = [0, ...(s.platforms ?? []).filter(here).map((p) => p.height), ...(s.floatingBlocks ?? []).filter(here).map((b) => b.bottom + 1),
          ...(s.fallingBlocks ?? []).filter(here).map((b) => b.height), ...(s.vanishing ?? []).filter(here).map((b) => b.height)]
        expect(tops, `spot ${c.spot} in ${s.id} at height ${c.height}`).toContain(c.height)
      }
    }
  })

  it('keeps the doorway cells clear of blocks and spikes, so every exit can be reached', () => {
    for (const s of ROOM_SPECS) {
      const solids = [...(s.platforms ?? []), ...(s.boxes ?? []), ...(s.spikes ?? []).filter((c) => !c.height)]
      for (const door of doorsOf(s)) {
        expect(solids.some((c) => c.x === door.cell.x && c.z === door.cell.z), `${s.id} ${door.direction} door blocked`).toBe(false)
      }
    }
  })

  // A guard walks its whole route, past the doorways as in the original, but
  // never starts beside one.
  it('starts guards, and keeps balls, off the doorways and the cells beside them, so entering a room is never a death', () => {
    for (const s of ROOM_SPECS) {
      const points = [...(s.pathGuards ?? []).map((g) => g.path[0]!), ...(s.balls ?? []), ...(s.hoppers ?? [])].flatMap(coveredCells)
      for (const p of points) {
        for (const door of doorsOf(s)) expect(beside(p, door.cell), `${s.id} path point ${p.x},${p.z} by the ${door.direction} door`).toBe(false)
      }
    }
  })

  it('keeps ghosts at least a cell away from every doorway, so a wolf entering at night is not caught on the threshold', () => {
    for (const s of ROOM_SPECS) {
      for (const g of s.ghosts ?? []) {
        for (const door of doorsOf(s)) expect(beside(g, door.cell), `${s.id} ghost at ${g.x},${g.z} by the ${door.direction} door`).toBe(false)
      }
    }
  })

  // Charms are not: many lie high up, reached as in the original by stepping on others.
  it('lets every door of a room not marked a puzzle be reached on foot: walking, climbing a block, jumping spike rows', () => {
    const unreachable: string[] = []
    for (const s of ROOM_SPECS.filter((r) => !r.puzzle)) {
      const stops = doorsOf(s).map((d) => d.cell)
      for (const to of stops.slice(1)) {
        try {
          findFloorPath(s, stops[0]!, to)
        } catch {
          unreachable.push(`${s.id} ${stops[0]!.x},${stops[0]!.z} -> ${to.x},${to.z}`)
        }
      }
    }
    expect(unreachable).toEqual([])
  })

  it('leaves no door out of reach: every room marked a puzzle is one solved in puzzles.spec.ts', () => {
    const puzzles = ROOM_SPECS.filter((r) => r.puzzle).map((r) => r.id).sort()
    expect(puzzles).toEqual([...SOLVED_PUZZLES].sort())
  })

  it('marks a room a puzzle only when some door cannot be reached on foot', () => {
    for (const s of ROOM_SPECS.filter((r) => r.puzzle)) {
      const doors = doorsOf(s).map((d) => d.cell)
      const stuck = doors.some((a) => doors.some((b) => a !== b && !walks(s, a, b)))
      expect(stuck, s.id).toBe(true)
    }
  })
})

describe('pickStartRoom', () => {
  it('picks one of the four start rooms from a random number, as the original does', () => {
    expect([0, 0.3, 0.6, 0.99].map(pickStartRoom)).toEqual(START_ROOMS)
  })
})
