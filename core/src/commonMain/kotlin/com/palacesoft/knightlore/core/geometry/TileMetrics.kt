package com.palacesoft.knightlore.core.geometry

/**
 * Isometric tile and geometry metrics. All dimensions are scaled-up versions of ZX Spectrum tile
 * dimensions. The ZX Spectrum used 32×16px tiles on a 256×192px screen; this game uses 3× scale
 * (96×48px tiles), which improves readability and allows for smoother sprite scaling.
 */
object TileMetrics {
    /** Width of a single isometric tile in screen pixels (ZX Spectrum base: 32px × 3 scale). */
    const val TILE_WIDTH = 96f

    /** Height of a single isometric tile in screen pixels (ZX Spectrum base: 16px × 2.5 scale). */
    const val TILE_HEIGHT = 40f

    /** Half the width of an isometric tile, used for X-axis projection. */
    const val HALF_TILE_WIDTH = 48f

    /** Half the height of an isometric tile, used for Y-axis projection (steeper angle: more floor visible, was 24). */
    const val HALF_TILE_HEIGHT = 20f

    /** Height of a single block unit in pixels. Taller blocks to match tile width scale (was 40). */
    const val BLOCK_HEIGHT = 48f

    /** Default footprint for solid actors and obstacles (1.0 = full tile coverage). */
    const val STANDARD_BLOCK_FOOTPRINT = 1.0f

    /** Footprint for typical actors like the player character (0.8 = 80% of a tile). */
    const val ACTOR_FOOTPRINT = 0.8f

    /** Footprint for small pickups and items (0.45 = 45% of a tile). */
    const val PICKUP_FOOTPRINT = 0.45f

    /** Vertical bias correction for room centering. Shifts the room up by 6% of viewport height to correct for isometric rooms appearing too low in the viewport. */
    const val ROOM_VERTICAL_BIAS = 0.06f
}
