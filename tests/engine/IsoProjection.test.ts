import { describe, it, expect } from 'vitest'
import {
  projectToScreen,
  screenToWorldGround,
  isoDepth,
  roomScreenOffset,
  filmationConfig,
  type IsoConfig,
} from '../../src/engine/IsoProjection'

// One tile = 2 world units (matches the simulation's TILE). Tile diamond is
// 32x16 screen px (classic 2:1 iso); 1 world unit of height = 16 px up.
const cfg: IsoConfig = {
  tile: 2,
  tileW: 32,
  tileH: 16,
  heightScale: 16,
  originX: 100,
  originY: 100,
}

describe('IsoProjection.projectToScreen', () => {
  it('maps the world origin to the configured screen origin', () => {
    expect(projectToScreen(0, 0, 0, cfg)).toEqual({ sx: 100, sy: 100 })
  })

  it('moving one tile east (+x) goes screen right and down by half a diamond', () => {
    expect(projectToScreen(2, 0, 0, cfg)).toEqual({ sx: 116, sy: 108 })
  })

  it('moving one tile south (+z) goes screen left and down by half a diamond', () => {
    expect(projectToScreen(0, 0, 2, cfg)).toEqual({ sx: 84, sy: 108 })
  })

  it('height (+y) raises the point on screen', () => {
    expect(projectToScreen(0, 1, 0, cfg)).toEqual({ sx: 100, sy: 84 })
  })
})

describe('IsoProjection.screenToWorldGround', () => {
  it('inverts projectToScreen on the ground plane (y = 0)', () => {
    const world = { x: 6, z: 4 }
    const screen = projectToScreen(world.x, 0, world.z, cfg)
    const back = screenToWorldGround(screen.sx, screen.sy, cfg)
    expect(back.x).toBeCloseTo(world.x)
    expect(back.z).toBeCloseTo(world.z)
  })
})

describe('IsoProjection.isoDepth', () => {
  it('orders objects nearer the camera (+x/+z) as greater depth', () => {
    expect(isoDepth(0, 0, 0)).toBeLessThan(isoDepth(2, 0, 0))
    expect(isoDepth(2, 0, 0)).toBeLessThan(isoDepth(2, 0, 2))
  })

  it('breaks ties at the same base by height (higher draws later)', () => {
    expect(isoDepth(2, 0, 2)).toBeLessThan(isoDepth(2, 1, 2))
  })
})

describe('filmationConfig', () => {
  it('projects one tile 32px wide and 16px tall, one height unit to 16px, like the original', async () => {
    const { filmationConfig } = await import('../../src/engine/IsoProjection')
    const cfg = filmationConfig(760, 560)
    const origin = projectToScreen(0, 0, 0, cfg)
    const east = projectToScreen(cfg.tile, 0, 0, cfg)
    const south = projectToScreen(0, 0, cfg.tile, cfg)
    const up = projectToScreen(0, 1, 0, cfg)
    expect(east.sx - origin.sx).toBe(16)
    expect(east.sy - origin.sy).toBe(8)
    expect(east.sx - south.sx).toBe(32)
    expect(origin.sy - up.sy).toBe(16)
  })
})

describe('roomScreenOffset', () => {
  it('leaves a full 8x8 room where it is', () => {
    expect(roomScreenOffset(8, 8, filmationConfig(256, 192))).toEqual({ dx: 0, dy: 0 })
  })

  it('moves a room narrow in x two tiles along x, so it stands in the middle as in the original', () => {
    const cfg = filmationConfig(256, 192)
    expect(roomScreenOffset(4, 8, cfg)).toEqual({ dx: 2 * cfg.tileW / 2, dy: 2 * cfg.tileH / 2 })
    expect(roomScreenOffset(8, 4, cfg)).toEqual({ dx: -2 * cfg.tileW / 2, dy: 2 * cfg.tileH / 2 })
  })
})
