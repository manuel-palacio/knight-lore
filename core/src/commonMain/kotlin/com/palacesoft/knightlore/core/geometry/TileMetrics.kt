package com.palacesoft.knightlore.core.geometry

object TileMetrics {
    const val TILE_WIDTH = 96f
    const val TILE_HEIGHT = 40f
    const val HALF_TILE_WIDTH = 48f
    const val HALF_TILE_HEIGHT = 20f   // steeper angle: more floor visible (was 24)
    const val BLOCK_HEIGHT = 48f       // taller blocks to match tile width scale (was 40)
    const val STANDARD_BLOCK_FOOTPRINT = 1.0f
    const val ACTOR_FOOTPRINT = 0.8f
    const val PICKUP_FOOTPRINT = 0.45f
}
