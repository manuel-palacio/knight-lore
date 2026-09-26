import { describe, it, expect } from 'vitest'
import { ROOM_SPECS, START_ROOMS, doorCell, entryFor, oppositeOf, type Cell, type RoomSpec } from '../../src/scenes/rooms/roomSpecs'
import { CHARMS } from '../../src/game/GameState'
import { findFloorPath } from '../e2e/support/roomPath'
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

  it('places every kind of charm twice and at least one extra life', () => {
    const placed = ROOM_SPECS.flatMap((s) => (s.pickups ?? []).map((p) => p.item))
    for (const charm of CHARMS) expect(placed.filter((i) => i === charm), charm).toHaveLength(2)
    expect(placed.filter((i) => i === 'life').length).toBeGreaterThanOrEqual(1)
  })

  it('puts at most one pickup in a room', () => {
    for (const s of ROOM_SPECS) expect((s.pickups ?? []).length, s.id).toBeLessThanOrEqual(1)
  })

  it('keeps every charm more than two rooms from the cauldron', () => {
    const fromCauldron = roomDistancesFrom('room-001')
    for (const s of ROOM_SPECS.filter((r) => r.pickups?.length)) {
      expect(fromCauldron.get(s.id), `${s.id} is too close to the cauldron`).toBeGreaterThan(2)
    }
  })

  it('keeps every charm out of the start rooms and the rooms beside them', () => {
    for (const start of START_ROOMS) {
      const fromStart = roomDistancesFrom(start)
      for (const s of ROOM_SPECS.filter((r) => r.pickups?.length)) {
        expect(fromStart.get(s.id), `${s.id} is too close to the start ${start}`).toBeGreaterThan(1)
      }
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

  it('reaches the cauldron and every charm from each start room without solving a puzzle', () => {
    const charmRooms = ROOM_SPECS.filter((s) => s.pickups?.length).map((s) => s.id)
    for (const start of START_ROOMS) {
      const reached = roomsOnFoot(start)
      expect(reached.has('room-001'), `cauldron from ${start}`).toBe(true)
      for (const id of charmRooms) expect(reached.has(id), `${id} from ${start}`).toBe(true)
    }
  })
})

describe('door geometry', () => {
  it('drops the player on the door axis of a narrow room too', () => {
    expect(entryFor('south', 4, 8)).toEqual({ x: 5, z: 1 })
    expect(entryFor('west', 8, 4)).toEqual({ x: 15, z: 5 })
    expect(entryFor('north', 4, 8)).toEqual({ x: 5, z: 15 })
  })

  it('puts the door cells mid-edge of the room, whatever its size', () => {
    expect(doorCell('north', 8, 8)).toEqual({ x: 4, z: 0 })
    expect(doorCell('south', 4, 8)).toEqual({ x: 2, z: 7 })
    expect(doorCell('east', 8, 4)).toEqual({ x: 7, z: 2 })
  })

  it('drops the player just inside the edge opposite to the door walked through, on the door axis', () => {
    expect(entryFor('south')).toEqual({ x: 9, z: 1 })
    expect(entryFor('north')).toEqual({ x: 9, z: 15 })
    expect(entryFor('east')).toEqual({ x: 1, z: 9 })
    expect(entryFor('west')).toEqual({ x: 15, z: 9 })
  })
})

describe('room contents', () => {
  it('keeps every placed cell inside its room', () => {
    for (const s of ROOM_SPECS) {
      const cells: Cell[] = [
        ...(s.platforms ?? []), ...(s.pushBlocks ?? []), ...(s.spikes ?? []), ...(s.pickups ?? []), ...(s.tables ?? []),
        ...(s.vanishing ?? []), ...(s.flames ?? []), ...(s.ghosts ?? []), ...(s.spikedBalls ?? []), s.spawn,
        ...(s.movingPlatforms ?? []).flatMap((p) => [p.from, p.to]),
        ...(s.pathGuards ?? []).flatMap((g) => g.path),
        ...(s.balls ?? []).flatMap((b) => [b.from, b.to]),
        ...(s.portcullises ?? []).flatMap((p) => [p.from, p.to]),
      ]
      for (const c of cells) expect(inRoom(s, c), `${s.id} ${JSON.stringify(c)}`).toBe(true)
    }
  })

  it('moves along one axis, for moving blocks, balls and gates', () => {
    for (const s of ROOM_SPECS) {
      for (const p of [...(s.movingPlatforms ?? []), ...(s.balls ?? []), ...(s.portcullises ?? [])]) {
        expect(p.from.x === p.to.x || p.from.z === p.to.z, `${s.id} ${JSON.stringify(p)}`).toBe(true)
      }
    }
  })

  it('never spawns the player on a solid or a spike', () => {
    for (const s of ROOM_SPECS) {
      const solids = [...(s.platforms ?? []), ...(s.pushBlocks ?? []), ...(s.spikes ?? [])]
      expect(solids.some((c) => c.x === s.spawn.x && c.z === s.spawn.z), s.id).toBe(false)
    }
  })

  it('never puts a pickup on a spike or a block', () => {
    for (const s of ROOM_SPECS) {
      for (const p of s.pickups ?? []) {
        const under = [...(s.spikes ?? []), ...(s.platforms ?? [])]
        expect(under.some((c) => c.x === p.x && c.z === p.z), `${s.id} ${p.item}`).toBe(false)
      }
    }
  })

  it('keeps the doorway cells clear of blocks and spikes, so every exit can be reached', () => {
    for (const s of ROOM_SPECS) {
      const solids = [...(s.platforms ?? []), ...(s.pushBlocks ?? []), ...(s.spikes ?? []).filter((c) => !c.height)]
      for (const door of doorsOf(s)) {
        expect(solids.some((c) => c.x === door.cell.x && c.z === door.cell.z), `${s.id} ${door.direction} door blocked`).toBe(false)
      }
    }
  })

  it('keeps guard and ball paths off the doorways and the cells beside them, so entering a room is never a death', () => {
    for (const s of ROOM_SPECS) {
      const points = [...(s.pathGuards ?? []).flatMap((g) => g.path), ...(s.balls ?? []).flatMap((b) => [b.from, b.to])]
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

  it('lets every door and charm of a room not marked a puzzle be reached on foot: walking, climbing a block, jumping spike rows', () => {
    const unreachable: string[] = []
    for (const s of ROOM_SPECS.filter((r) => !r.puzzle)) {
      const stops = [...doorsOf(s).map((d) => d.cell), ...(s.pickups ?? [])]
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
