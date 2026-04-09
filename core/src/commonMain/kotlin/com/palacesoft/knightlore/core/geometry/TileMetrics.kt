package com.palacesoft.knightlore.core.geometry

/**
 * Isometric tile and geometry metrics. All dimensions are scaled-up versions of ZX Spectrum tile
 * dimensions. The ZX Spectrum used 32×16px tiles on a 256×192px screen; this game uses 3× scale
 * (96×48px tiles), which improves readability and allows for smoother sprite scaling.
 */
object TileMetrics {
    /** Width of a single isometric tile in screen pixels. Zoomed in ~35% for detail. */
    const val TILE_WIDTH = 130f

    /** Height of a single isometric tile in screen pixels. */
    const val TILE_HEIGHT = 54f

    /** Half the width of an isometric tile, used for X-axis projection. */
    const val HALF_TILE_WIDTH = 65f

    /** Half the height of an isometric tile, used for Y-axis projection. */
    const val HALF_TILE_HEIGHT = 27f

    /** Height of a single block unit in pixels. */
    const val BLOCK_HEIGHT = 65f

    /** Default footprint for solid actors and obstacles (1.0 = full tile coverage). */
    const val STANDARD_BLOCK_FOOTPRINT = 1.0f

    /** Footprint for typical actors like the player character (0.8 = 80% of a tile). */
    const val ACTOR_FOOTPRINT = 0.8f

    /** Footprint for small pickups and items (0.45 = 45% of a tile). */
    const val PICKUP_FOOTPRINT = 0.45f

    /** Vertical bias for room centering. Positive = shift room up, negative = down. */
    const val ROOM_VERTICAL_BIAS = -0.02f
}

/**
 * Authentic ZX Spectrum 15-color palette.
 * Knight Lore on the Spectrum used BRIGHT WHITE/CYAN for all geometry on a BLACK background.
 * Semantic aliases map game concepts to palette colors.
 */
object ZXPalette {
    // Standard colors
    const val BLACK    = 0xFF_000000.toInt()
    const val BLUE     = 0xFF_0000AA.toInt()
    const val RED      = 0xFF_AA0000.toInt()
    const val MAGENTA  = 0xFF_AA00AA.toInt()
    const val GREEN    = 0xFF_00AA00.toInt()
    const val CYAN     = 0xFF_00AAAA.toInt()
    const val YELLOW   = 0xFF_AA5500.toInt()
    const val WHITE    = 0xFF_AAAAAA.toInt()

    // BRIGHT variants
    const val B_BLUE    = 0xFF_0055FF.toInt()
    const val B_RED     = 0xFF_FF5555.toInt()
    const val B_MAGENTA = 0xFF_FF55FF.toInt()
    const val B_GREEN   = 0xFF_55FF55.toInt()
    const val B_CYAN    = 0xFF_55FFFF.toInt()
    const val B_YELLOW  = 0xFF_FFFF55.toInt()
    const val B_WHITE   = 0xFF_FFFFFF.toInt()

    // ── Warm earth-tone aliases matching Knight Lore GBC palette ──
    const val STONE_DARK  = 0xFF_3A3828.toInt()   // dark olive shadow
    const val STONE_MID   = 0xFF_6A6A50.toInt()   // olive-grey wall face
    const val STONE_LIGHT = 0xFF_9A9A78.toInt()   // light tan highlight / top
    const val STONE_CREAM = 0xFF_B0AA88.toInt()    // cream wall top
    const val FLOOR_A     = BLACK
    const val FLOOR_B     = 0xFF_1A1810.toInt()   // very dark olive floor
    const val SKIN        = B_YELLOW
    const val CAPE        = RED
    const val METAL       = 0xFF_AAAAAA.toInt()   // silver grey helmet
    const val WOLF_FUR    = 0xFF_8A8A9A.toInt()   // grey wolf body
    const val WOLF_DARK   = 0xFF_5A5A6A.toInt()   // darker grey wolf shadow
    const val WOLF_EYE    = B_WHITE               // white wolf eyes
    const val GOLD_ITEM   = B_YELLOW
    const val CAULDRON    = 0xFF_AA4400.toInt()    // warm red-brown cauldron
    const val TORCH       = B_YELLOW
    const val TORCH_BASE  = YELLOW
}
