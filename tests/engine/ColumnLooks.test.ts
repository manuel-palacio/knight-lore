import { describe, it, expect } from 'vitest'
import { columnSegments, type DecorKind } from '../../src/engine/ColumnLooks'

const decor = (levels: Record<number, DecorKind>) => (level: number) => levels[level]

describe('columnSegments', () => {
  it('draws a column of plain blocks as one', () => {
    expect(columnSegments(3, decor({}))).toEqual([{ bottom: 0, top: 3, look: 'block' }])
  })

  it('draws a gargoyle on a pedestal as a block and the gargoyle over it', () => {
    expect(columnSegments(2, decor({ 1: 'gargoyle' }))).toEqual([
      { bottom: 0, top: 1, look: 'block' },
      { bottom: 1, top: 2, look: 'gargoyle' },
    ])
  })

  it('draws each hedge of a hedge wall as itself', () => {
    expect(columnSegments(3, decor({ 0: 'hedge', 1: 'hedge', 2: 'hedge' })).map((s) => s.look)).toEqual(['hedge', 'hedge', 'hedge'])
  })
})
