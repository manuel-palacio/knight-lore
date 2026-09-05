// Isometric projection for the 2D Filmation renderer. Pure math — no canvas, no
// DOM — so it is unit-tested directly. World space is the simulation's continuous
// coordinate system (x east, z south, y up; `tile` world units per tile). Screen
// space is canvas pixels before any integer upscale.

export interface IsoConfig {
  tile: number // world units per tile (matches simulation TILE)
  tileW: number // screen width of one tile diamond
  tileH: number // screen height of one tile diamond
  heightScale: number // screen px per world unit of height
  originX: number // screen x of world origin
  originY: number // screen y of world origin
}

// The original's proportions: a block 32px wide, 16px tall on screen, and one
// world unit of height 16px, so a 2-unit block is a 32x32 cube and Sabreman
// (31px) stands one block tall. Origin sits so an 8x8 room is centred with
// headroom for the back walls.
export function filmationConfig(width: number, height: number): IsoConfig {
  return { tile: 2, tileW: 32, tileH: 16, heightScale: 16, originX: width / 2, originY: height * 0.32 }
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

// Inverse of projectToScreen on the ground plane (y = 0). Screen y alone can't
// recover height, so callers that need a 3D point must supply the plane.
export function screenToWorldGround(sx: number, sy: number, cfg: IsoConfig): { x: number; z: number } {
  const a = (sx - cfg.originX) / (cfg.tileW / 2) // u - v
  const b = (sy - cfg.originY) / (cfg.tileH / 2) // u + v  (at y = 0)
  const u = (a + b) / 2
  const v = (b - a) / 2
  return { x: u * cfg.tile, z: v * cfg.tile }
}

// Painter's-algorithm sort key: larger = nearer the camera, drawn later (on top).
// Base ordering is x+z; height is a small tiebreaker so a block stacked on another
// at the same footprint paints after it.
const HEIGHT_TIEBREAK = 1e-3

export function isoDepth(wx: number, wy: number, wz: number): number {
  return wx + wz + wy * HEIGHT_TIEBREAK
}
