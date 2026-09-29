// Isometric projection for the 2D Filmation renderer. Pure math — no canvas, no
// DOM — so it is unit-tested directly. World space is the simulation's continuous
// coordinate system (x east, z south, y up; `tile` world units per tile). Screen
// space is canvas pixels before any integer upscale.

import { FULL_ROOM_CELLS, PIXELS_PER_BLOCK } from './OriginalPixels'

export interface IsoConfig {
  tile: number // world units per tile (matches simulation TILE)
  tileW: number // screen width of one tile diamond
  tileH: number // screen height of one tile diamond
  heightScale: number // screen px per world unit of height
  originX: number // screen x of world origin
  originY: number // screen y of world origin
}

// The original's projection (0xD6D1): a cell 32px wide and 16px tall on
// screen, a block 12px high, and the room's far corner at the floor
// ROOM_ORIGIN_Y down the 256x192 screen, so that the room's own wall
// sprites (see Backdrop) and everything else land where the original has them.
const ROOM_ORIGIN_Y = 39

export function filmationConfig(width: number, _height: number): IsoConfig {
  return { tile: 2, tileW: 32, tileH: 16, heightScale: PIXELS_PER_BLOCK, originX: width / 2, originY: ROOM_ORIGIN_Y }
}

// The screen shift that stands a room smaller than 8x8 in the middle, where
// the original draws its narrow rooms: half the missing tiles along each axis.

export function roomScreenOffset(width: number, depth: number, cfg: IsoConfig): { dx: number; dy: number } {
  const u = (FULL_ROOM_CELLS - width) / 2
  const v = (FULL_ROOM_CELLS - depth) / 2
  return { dx: (u - v) * (cfg.tileW / 2), dy: (u + v) * (cfg.tileH / 2) }
}

export interface ScreenPoint {
  sx: number
  sy: number
}

export function projectToScreen(wx: number, wy: number, wz: number, cfg: IsoConfig): ScreenPoint {
  const u = wx / cfg.tile
  const v = wz / cfg.tile
  return {
    sx: cfg.originX + (u - v) * (cfg.tileW / 2),
    sy: cfg.originY + (u + v) * (cfg.tileH / 2) - wy * cfg.heightScale,
  }
}

// Painter's-algorithm sort key: larger = nearer the camera, drawn later (on top).
// Base ordering is x+z; height is a small tiebreaker so a block stacked on another
// at the same footprint paints after it.
const HEIGHT_TIEBREAK = 1e-3

export function isoDepth(wx: number, wy: number, wz: number): number {
  return wx + wz + wy * HEIGHT_TIEBREAK
}
