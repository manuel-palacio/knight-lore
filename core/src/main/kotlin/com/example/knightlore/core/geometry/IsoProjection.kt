package com.example.knightlore.core.geometry

import com.example.knightlore.core.math.Vec2f

object IsoProjection {
    fun toScreen(worldX: Float, worldY: Float, worldZ: Float): Vec2f {
        val sx = (worldX - worldY) * TileMetrics.HALF_TILE_WIDTH
        val sy = (worldX + worldY) * TileMetrics.HALF_TILE_HEIGHT - worldZ * TileMetrics.BLOCK_HEIGHT
        return Vec2f(sx, sy)
    }
}
