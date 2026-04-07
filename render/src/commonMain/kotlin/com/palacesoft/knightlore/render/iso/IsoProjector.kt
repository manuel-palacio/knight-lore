package com.palacesoft.knightlore.render.iso

import com.palacesoft.knightlore.core.geometry.TileMetrics
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.RoomTransitionState

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
            y = viewportH / 2f - centerScreen.y - viewportH * TileMetrics.ROOM_VERTICAL_BIAS,
        )
    }

    /**
     * During a room transition, compute a pixel offset to slide the room in/out.
     * The outgoing room slides out in the exit direction; the incoming slides in
     * from the opposite side. An ease-in-out cubic is applied for smooth motion.
     *
     * @param transition current transition state (null = no transition, returns ZERO)
     * @param viewWidth  viewport pixel width
     * @param viewHeight viewport pixel height
     * @param isOutgoing true = apply to the FROM room; false = apply to the TO room
     */
    fun transitionOffset(
        transition: RoomTransitionState?,
        viewWidth: Float,
        viewHeight: Float,
        isOutgoing: Boolean,
    ): Vec2f {
        transition ?: return Vec2f.ZERO
        val progress = 1f - transition.ticksRemaining.toFloat() / transition.totalTicks.toFloat()
        // Ease-in-out cubic
        val t = if (progress < 0.5f) 4f * progress * progress * progress
                else 1f - (-2f * progress + 2f).let { it * it * it } / 2f

        // Direction vector for the exit side (isometric: NORTH = up-left, EAST = up-right etc.)
        val (dx, dy) = when (transition.exitSide) {
            ExitSide.NORTH -> -0.5f to -0.5f
            ExitSide.SOUTH ->  0.5f to  0.5f
            ExitSide.EAST  ->  0.5f to -0.5f
            ExitSide.WEST  -> -0.5f to  0.5f
        }
        val slideX = dx * viewWidth
        val slideY = dy * viewHeight

        return if (isOutgoing) {
            Vec2f(slideX * t, slideY * t)
        } else {
            Vec2f(slideX * (t - 1f), slideY * (t - 1f))
        }
    }
}
