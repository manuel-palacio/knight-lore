import { describe, it, expect } from 'vitest'
import { wallBox } from '../../src/engine/IsoRenderer'
import { drawOrder } from '../../src/engine/DrawOrder'
import { backdropWorldPlace } from '../../src/engine/Backdrop'
import { isoDepth } from '../../src/engine/IsoProjection'
import { ROOM_SPECS } from '../../src/scenes/rooms/roomSpecs'

// He, 0.8 across and 1.6 high, in the north-west corner of a full room.
const him = { name: 'him', depth: 0, box: { x0: 0.05, x1: 0.85, z0: 0.05, z1: 0.85, y0: 0, y1: 1.6 } }
const piece = (name: string, at: { x: number; y: number; z: number }) => ({ name, depth: 1, box: wallBox(at, 16, 16) })

describe('wall pieces in the draw order', () => {
  it('a far wall piece is drawn before him in the corner, though its place is a little east of him', () => {
    const order = drawOrder([him, piece('north wall corner', { x: 0.88, y: 0, z: 0 }), piece('west wall', { x: -0.13, y: 0, z: 1 })])
    expect(order.at(-1)!.name).toBe('him')
  })

  it('a near wall piece is drawn after him', () => {
    const order = drawOrder([piece('south arch', { x: 9.6, y: 0, z: 16.6 }), { ...him, depth: 5, box: { ...him.box, z0: 15, z1: 15.8 } }])
    expect(order.at(-1)!.name).toBe('south arch')
  })
})

describe('walking along the far walls of real rooms', () => {
  it('no far wall piece is ever drawn over him, wherever he stands along the north and west walls', () => {
    for (const room of ROOM_SPECS) {
      const width = (room.width ?? 8) * 2
      const depth = (room.depth ?? 8) * 2
      const far = (room.backdrop ?? []).map((p) => ({ name: `g${p.graphic}`, at: backdropWorldPlace(p, room.width ?? 8, room.depth ?? 8) }))
        .filter((p) => p.at.z <= 0 || p.at.x <= 0)
        .map((p) => ({ name: p.name, depth: isoDepth(p.at.x, p.at.y, p.at.z), box: wallBox(p.at, width, depth) }))
      const spots = [
        ...Array.from({ length: Math.round((width - 0.9) / 0.1) }, (_, i) => ({ x: 0.45 + i * 0.1, z: 0.45 })),
        ...Array.from({ length: Math.round((depth - 0.9) / 0.1) }, (_, i) => ({ x: 0.45, z: 0.45 + i * 0.1 })),
      ]
      for (const at of spots) {
        const me = { name: 'him', depth: isoDepth(at.x, 0, at.z), box: { x0: at.x - 0.4, x1: at.x + 0.4, z0: at.z - 0.4, z1: at.z + 0.4, y0: 0, y1: 1.6 } }
        expect(drawOrder([...far, me]).at(-1)!.name, `${room.id} at ${at.x.toFixed(2)},${at.z.toFixed(2)}`).toBe('him')
      }
    }
  })
})
