import type { Direction, RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import type { Cell } from './game'

const GRID = 8
export const DOOR_CELL: Record<Direction, Cell> = {
  north: { x: 4, z: 0 }, south: { x: 4, z: 7 }, west: { x: 0, z: 4 }, east: { x: 7, z: 4 },
}
const key = (c: Cell) => `${c.x},${c.z}`

// Breadth-first path over the floor cells a walker can stand on: everything
// except blocks, spikes, tables, flames and the cauldron. It keeps to the
// clear lane off every guard's and ball's line (tools/map/emit.py checks
// each room has one) and crosses a line only when it starts or ends on one.
export function findFloorPath(spec: RoomSpec, from: Cell, to: Cell): Cell[] {
  const blocked = blockedCells(spec)
  const offPatrols = new Set([...blocked, ...patrolledCells(spec)])
  offPatrols.delete(key(from))
  offPatrols.delete(key(to))
  const path = searchPath(offPatrols, from, to) ?? searchPath(blocked, from, to)
  if (!path) throw new Error(`${spec.id}: no floor path ${key(from)} -> ${key(to)}`)
  return path
}

function searchPath(blocked: Set<string>, from: Cell, to: Cell): Cell[] | undefined {
  const cameFrom = new Map<string, Cell | null>([[key(from), null]])
  const queue = [from]
  while (queue.length > 0) {
    const cell = queue.shift()!
    if (cell.x === to.x && cell.z === to.z) return rebuild(cameFrom, cell)
    for (const next of neighbours(cell)) {
      if (cameFrom.has(key(next)) || blocked.has(key(next))) continue
      cameFrom.set(key(next), cell)
      queue.push(next)
    }
  }
  return undefined
}

// The cells a guard or a ball passes through: each leg of its loop stepped
// one cell at a time towards the next waypoint on each axis, as the ball
// moves (a ball's line is a loop of two).
export function patrolledCells(spec: RoomSpec): Set<string> {
  const routes = [...(spec.pathGuards ?? []).map((g) => g.path), ...(spec.balls ?? []).map((b) => [b.from, b.to])]
  const cells = new Set<string>()
  for (const route of routes) {
    route.forEach((start, i) => {
      const end = route[(i + 1) % route.length]!
      const at = { ...start }
      cells.add(key(at))
      while (at.x !== end.x || at.z !== end.z) {
        at.x += Math.sign(end.x - at.x)
        at.z += Math.sign(end.z - at.z)
        cells.add(key(at))
      }
    })
  }
  return cells
}

function blockedCells(spec: RoomSpec): Set<string> {
  const cells = [
    ...(spec.platforms ?? []), ...(spec.pushBlocks ?? []), ...(spec.spikes ?? []),
    ...(spec.tables ?? []), ...(spec.flames ?? []), ...(spec.cauldron ? [spec.cauldron] : []),
  ]
  return new Set(cells.map(key))
}

function neighbours(c: Cell): Cell[] {
  return [
    { x: c.x + 1, z: c.z }, { x: c.x - 1, z: c.z }, { x: c.x, z: c.z + 1 }, { x: c.x, z: c.z - 1 },
  ].filter((n) => n.x >= 0 && n.z >= 0 && n.x < GRID && n.z < GRID)
}

function rebuild(cameFrom: Map<string, Cell | null>, end: Cell): Cell[] {
  const path = [end]
  let previous = cameFrom.get(key(end))
  while (previous) {
    path.unshift(previous)
    previous = cameFrom.get(key(previous))
  }
  return path
}
