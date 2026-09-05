import { describe, it, expect } from 'vitest'
import { Table } from '../../src/game/Table'
import { Category } from '../../src/engine/categories'

describe('Table', () => {
  it('is a support surface centred on its cell', () => {
    const t = new Table(3, 5, 1.5, 2)
    expect(t.hasCategory(Category.SUPPORT_SURFACE)).toBe(true)
    expect(t.position.x).toBe(7)
    expect(t.position.z).toBe(11)
  })

  it('supports an actor at or near its top but not one walking underneath', () => {
    const t = new Table(3, 5, 1.5, 2)
    expect(t.supportAt(7, 11, 1.5)).toBe(1.5)
    expect(t.supportAt(7, 11, 2.5)).toBe(1.5)
    expect(t.supportAt(7, 11, 0)).toBeNull()
    expect(t.supportAt(9.5, 11, 1.5)).toBeNull()
  })
})
