import type { Direction, RoomSpec } from '../../../src/scenes/rooms/roomSpecs'
import type { Cell } from './game'

const GRID = 8
export const DOOR_CELL: Record<Direction, Cell> = {
  north: { x: 4, z: 0 }, south: { x: 4, z: 7 }, west: { x: 0, z: 4 }, east: { x: 7, z: 4 },
}
// Breadth-first path over the floor cells a walker can stand on: everything
// except blocks, spikes, tables, flames and the cauldron.
export function findFloorPath(spec: RoomSpec, from: Cell, to: Cell): Cell[] {
  const blocked = blockedCells(spec)
  const key = (c: Cell) => `${c.x},${c.z}`
  const cameFrom = new Map<string, Cell | null>([[key(from), null]])
  const queue = [from]
  while (queue.length > 0) {
    const cell = queue.shift()!
    if (cell.x === to.x && cell.z === to.z) return rebuild(cameFrom, cell, key)
    for (const next of neighbours(cell)) {
      if (cameFrom.has(key(next)) || blocked.has(key(next))) continue
      cameFrom.set(key(next), cell)
      queue.push(next)
    }
  }
  throw new Error(`${spec.id}: no floor path ${key(from)} -> ${key(to)}`)
}

function blockedCells(spec: RoomSpec): Set<string> {
  const cells = [
    ...(spec.platforms ?? []), ...(spec.pushBlocks ?? []), ...(spec.spikes ?? []),
    ...(spec.tables ?? []), ...(spec.flames ?? []), ...(spec.cauldron ? [spec.cauldron] : []),
  ]
  return new Set(cells.map((c) => `${c.x},${c.z}`))
}

function neighbours(c: Cell): Cell[] {
  return [
    { x: c.x + 1, z: c.z }, { x: c.x - 1, z: c.z }, { x: c.x, z: c.z + 1 }, { x: c.x, z: c.z - 1 },
  ].filter((n) => n.x >= 0 && n.z >= 0 && n.x < GRID && n.z < GRID)
}

function rebuild(cameFrom: Map<string, Cell | null>, end: Cell, key: (c: Cell) => string): Cell[] {
  const path = [end]
  let previous = cameFrom.get(key(end))
  while (previous) {
    path.unshift(previous)
    previous = cameFrom.get(key(previous))
  }
  return path
}
