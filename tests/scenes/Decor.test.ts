import { describe, it, expect } from 'vitest'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'
import { buildRoomFromSpec } from '../../src/scenes/rooms/specBuilder'
import { columnSegments } from '../../src/engine/ColumnLooks'
import { GameState } from '../../src/game/GameState'

// Hedges (the room table's t3, graphic 6) and gargoyles (t4, graphic 22) are
// blocks drawn with their own sprites, as the original draws them.
const room = (id: string) => buildRoomFromSpec(ROOM_SPECS.find((s) => s.id === id)!)(new GameState())

describe('rooms with hedges and gargoyles', () => {
  it('a garden room builds with its hedges, and draws those levels as hedges, not the plain block', async () => {
    const garden = await room('map-7--5')
    const hedges = [...garden.decor].filter(([, kind]) => kind === 'hedge')
    expect(hedges.length).toBeGreaterThan(0)
    for (const [cell] of hedges) {
      const [x, z, level] = cell.split(',').map(Number) as [number, number, number]
      const column = columnSegments(garden.grid.supportHeight(x, z) || level + 1, (l) => garden.decorAt(x, z, l))
      expect(column.find((s) => s.bottom === level)?.look, cell).toBe('hedge')
    }
  })

  it('a hall of gargoyles builds each on its pedestal: a block, the gargoyle over it', async () => {
    const hall = await room('map--1-1')
    const gargoyles = [...hall.decor].filter(([, kind]) => kind === 'gargoyle')
    expect(gargoyles.length).toBe(4)
    for (const [cell] of gargoyles) {
      const [x, z, level] = cell.split(',').map(Number) as [number, number, number]
      expect(columnSegments(hall.grid.supportHeight(x, z), (l) => hall.decorAt(x, z, l)).map((s) => s.look), cell).toEqual(['block', 'gargoyle'])
      expect(level).toBe(1)
    }
  })

  it('every hedge and gargoyle of the castle stands on a level of a column or in the air, never on nothing drawn', async () => {
    for (const spec of ROOM_SPECS.filter((s) => s.decor?.length)) {
      const built = await buildRoomFromSpec(spec)(new GameState())
      for (const d of spec.decor!) {
        const column = built.grid.supportHeight(d.x, d.z)
        const floating = (spec.floatingBlocks ?? []).some((b) => b.x === d.x && b.z === d.z && b.bottom === d.height)
        expect(d.height < column || floating, `${spec.id} ${d.kind} at ${d.x},${d.z},${d.height}`).toBe(true)
      }
    }
  })
})
