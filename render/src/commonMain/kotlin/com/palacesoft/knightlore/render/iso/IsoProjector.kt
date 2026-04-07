package com.palacesoft.knightlore.render.iso

import com.palacesoft.knightlore.core.geometry.TileMetrics
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f

/**
 * Converts world-space positions to screen-space pixel positions using the
 * standard dimetric isometric projection for this game.
 *
 * Coordinate system: X = east, Y = south, Z = up.
 * Projection:
 *   screenX = (worldX - worldY) * HALF_TILE_WIDTH
 *   screenY = (worldX + worldY) * HALF_TILE_HEIGHT - worldZ * BLOCK_HEIGHT
 */
object IsoProjector {

    /** Projects a world position to screen pixel offset (uncentered, relative to room origin). */
    fun toScreen(world: Vec3f): Vec2f = Vec2f(
        x = (world.x - world.y) * TileMetrics.HALF_TILE_WIDTH,
        y = (world.x + world.y) * TileMetrics.HALF_TILE_HEIGHT - world.z * TileMetrics.BLOCK_HEIGHT,
    )

    /** Overload for convenience. */
    fun toScreen(x: Float, y: Float, z: Float): Vec2f = toScreen(Vec3f(x, y, z))

    /**
     * Sort key for depth ordering: higher value = drawn later (in front).
     * Uses feet-anchor world position so tall sprites sort by where they stand.
     */
    fun depthKey(feetWorld: Vec3f): Int =
        ((feetWorld.x + feetWorld.y + feetWorld.z) * 1000f).toInt()

    /**
     * Returns the screen-space offset to center a room of the given grid dimensions
     * on a viewport of the given pixel size.
     *
     * @param roomWidth  room width in tiles
     * @param roomDepth  room depth in tiles
     * @param viewportW  viewport width in pixels
     * @param viewportH  viewport height in pixels
     */
    fun roomOffset(roomWidth: Int, roomDepth: Int, viewportW: Float, viewportH: Float): Vec2f {
        // The room's isometric center is at world position (roomWidth/2, roomDepth/2, 0)
        val centerScreen = toScreen(roomWidth / 2f, roomDepth / 2f, 0f)
        return Vec2f(
            x = viewportW / 2f - centerScreen.x,
            y = viewportH / 2f - centerScreen.y - viewportH * 0.06f,  // was 0.12f
        )
    }
}
