package com.palacesoft.knightlore.render.scene

import com.palacesoft.knightlore.core.math.Vec2f

/** Layer order for draw sorting. Lower = drawn first (behind). */
enum class DrawLayer {
    FLOOR,      // floor tiles
    BLOCK,      // solid blocks and walls
    ITEM,       // items on the floor
    ACTOR,      // enemies and interactive objects
    PLAYER,     // player character
    EFFECT,     // particles, hazard indicators
    HUD,        // HUD overlays (not sorted with scene)
}

/**
 * A single draw instruction emitted by RoomEntityFactory.
 * Commands are depth-sorted before being executed by CanvasSceneRenderer.
 */
data class DrawCommand(
    val layer: DrawLayer,
    val depthKey: Int,              // from IsoProjector.depthKey(feetWorld)
    val priority: Int = 0,          // tiebreaker: higher = in front
    val entityId: String,           // stable ID for sort stability
    val screenPos: Vec2f,           // top-left of sprite on screen (after room offset)
    val payload: DrawPayload,
)

/** What to actually draw. Phase 4 uses colored shapes; Phase 5+ uses sprites. */
sealed interface DrawPayload {
    data class ColorRect(
        val widthPx: Float,
        val heightPx: Float,
        val colorArgb: Int,         // ARGB packed int (e.g. 0xFF_44AA66.toInt())
    ) : DrawPayload

    data class ColorOval(
        val widthPx: Float,
        val heightPx: Float,
        val colorArgb: Int,
    ) : DrawPayload

    // Phase 5+: data class Sprite(val atlasId: String, val frame: Int) : DrawPayload
}
