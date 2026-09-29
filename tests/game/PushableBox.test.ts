import { describe, it, expect } from 'vitest'
import { PushableBox } from '../../src/game/PushableBox'
import { FloatingBlock } from '../../src/game/FloatingBlock'
import { Grid } from '../../src/engine/Grid'
import { runFrames } from './frames'

const pace = 3 / 8 // Sabreman's three pixels a frame, in units
const east = { x: pace, z: 0 }

function room(boxes: PushableBox[], grid = new Grid(8, 8)) {
  return { grid, tileSize: 2, boxes }
}

// The original's pushables: tables (0xC4C3), chests (0xC4B6), pushed by the
// collision code (0xCBCD), riders (0xCC6F).
describe('PushableBox', () => {
  it('is as big as the template: a table 12 by 20 pixels, a chest 18 by 12, a block high', () => {
    const table = new PushableBox('table', { x: 7, z: 7 }, 0)
    expect([table.extents.x, table.extents.z, table.top]).toEqual([1.5, 2.5, 1])
    const chest = new PushableBox('chest', { x: 7, z: 7 }, 0)
    expect([chest.extents.x, chest.extents.z]).toEqual([2.25, 1.5])
  })

  it('is solid: its top holds up and stops whoever walks into it below it', () => {
    const table = new PushableBox('table', { x: 7, z: 7 }, 0)
    expect(table.supportAt(7, 7, 0)).toBe(1)
    expect(table.supportAt(7, 7, 1)).toBe(1)
    expect(table.supportAt(9, 7, 0)).toBeNull()
  })

  it('a table moves only while it is pushed, at the pusher\'s pace', () => {
    const table = new PushableBox('table', { x: 7, z: 7 }, 0)
    const ctx = room([table])
    table.push(east)
    runFrames(table, 1, ctx)
    expect(table.position.x).toBeCloseTo(7 + pace, 9)
    runFrames(table, 5, ctx)
    expect(table.position.x).toBeCloseTo(7 + pace, 9)
  })

  it('tells, once, that it has moved since it was last asked: the frames the push effect sounds on (0xC232)', () => {
    const table = new PushableBox('table', { x: 7, z: 7 }, 0)
    const ctx = room([table])
    expect(table.consumeMoved()).toBe(false)
    table.push(east)
    runFrames(table, 1, ctx)
    expect(table.consumeMoved()).toBe(true)
    expect(table.consumeMoved()).toBe(false)
    runFrames(table, 3, ctx)
    expect(table.consumeMoved()).toBe(false)
  })

  it('a chest slides on until something stops it', () => {
    const chest = new PushableBox('chest', { x: 7, z: 7 }, 0)
    const ctx = room([chest])
    chest.push(east)
    runFrames(chest, 40, ctx)
    expect(chest.position.x + chest.halfX).toBeLessThanOrEqual(16)
    expect(chest.position.x + chest.halfX).toBeGreaterThan(16 - pace)
    expect(chest.velocity).toEqual({ x: 0, z: 0 })
  })

  it('is stopped by a block and by another box', () => {
    const grid = new Grid(8, 8)
    grid.setSupport(5, 3, 1)
    const chest = new PushableBox('chest', { x: 7, z: 7 }, 0)
    runFrames(chest, 0, room([chest], grid))
    chest.push(east)
    runFrames(chest, 40, room([chest], grid))
    expect(chest.position.x + chest.halfX).toBeLessThanOrEqual(10)
    const a = new PushableBox('table', { x: 7, z: 7 }, 0)
    const b = new PushableBox('table', { x: 8.5, z: 7 }, 0)
    a.push(east)
    runFrames(a, 1, room([a, b]))
    expect(a.position.x).toBe(7)
  })

  it('carries a box standing on it along', () => {
    const under = new PushableBox('table', { x: 7, z: 7 }, 0)
    const over = new PushableBox('table', { x: 7, z: 7 }, 1)
    under.push(east)
    runFrames(under, 1, room([under, over]))
    expect(over.position.x).toBeCloseTo(7 + pace, 9)
  })

  it('falls when pushed off what it stands on', () => {
    const grid = new Grid(8, 8)
    grid.setSupport(3, 3, 1)
    const chest = new PushableBox('chest', { x: 7, z: 7 }, 1)
    const ctx = room([chest], grid)
    for (let i = 0; i < 10; i++) {
      chest.push(east)
      runFrames(chest, 1, ctx)
    }
    runFrames(chest, 20, ctx)
    expect(chest.bottom).toBe(0)
  })

  it('is back where it was when the room is entered again', () => {
    const chest = new PushableBox('chest', { x: 7, z: 7 }, 0)
    chest.push(east)
    runFrames(chest, 5, room([chest]))
    chest.reset()
    expect(chest.position.x).toBe(7)
  })

  it('rests on floating blocks under it, not sinking through them (map--7--6\'s chest)', () => {
    const blocks = [new FloatingBlock(2, 1, 2, 2), new FloatingBlock(3, 1, 2, 2)] // tops at 3
    const chest = new PushableBox('chest', { x: 6, z: 3 }, 3)
    runFrames(chest, 20, { ...room([chest]), entities: [...blocks, chest] })
    expect(chest.bottom).toBe(3)
  })

  it('stops against a floating block it is pushed into, as against any block', () => {
    const block = new FloatingBlock(4, 3, 0, 2) // cell (4, 3), from the floor to level 1
    const table = new PushableBox('table', { x: 7, z: 7 }, 0)
    const ctx = { ...room([table]), entities: [block, table] }
    for (let i = 0; i < 20; i++) {
      table.push(east)
      runFrames(table, 1, ctx)
    }
    expect(table.position.x + table.halfX).toBeLessThanOrEqual(8 + 1e-6)
  })
})
