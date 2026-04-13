package com.palacesoft.knightlore.render.scene

import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.render.art.AuthoredSprite as AuthoredSpriteModel

/** Flip to true to force all authored sprites to pure black — silhouette readability test. */
const val SILHOUETTE_TEST_MODE = false // flip to true for shape testing

/** Layer order for draw sorting. Lower = drawn first (behind). */
enum class DrawLayer {
    FLOOR,       // floor tiles
    BLOCK,       // solid blocks and walls
    ITEM,        // items on the floor
    ACTOR,       // enemies and interactive objects
    PLAYER,      // player character
    FOREGROUND,  // blocks/objects that should render in front of the player
    EFFECT,      // particles, hazard indicators
    HUD,         // HUD overlays (not sorted with scene)
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

    data class ColorPath(
        val points: List<Vec2f>,   // absolute screen coords
        val colorArgb: Int,
        val shadowColorArgb: Int? = null,  // if set, draws inset shadow border
    ) : DrawPayload

    /** Draws a straight line between two absolute screen-space points. */
    data class Line(
        val x1: Float,
        val y1: Float,
        val x2: Float,
        val y2: Float,
        val colorArgb: Int,
        val strokeWidth: Float = 1.5f,
    ) : DrawPayload

    /**
     * Fills a polygon with a dither pattern.
     * horizontal=false (default): 2×2px checkerboard — color1 at (0,0)+(1,1), color2 at (0,1)+(1,0).
     * horizontal=true: 2px horizontal rows alternating color1/color2 — ZX Spectrum wall look.
     */
    data class DitheredPath(
        val points: List<Vec2f>,
        val color1: Int,
        val color2: Int,
        val horizontal: Boolean = false,
    ) : DrawPayload

    /**
     * Fills the entire screen with a solid color (screenPos is ignored).
     * Used for dark dungeon overlay and fade effects.
     */
    data class ScreenFill(val colorArgb: Int) : DrawPayload

    /**
     * Renders an authored multi-layer sprite. Each layer is a polygon with fill color.
     * When [SILHOUETTE_TEST_MODE] is true, all layers render as pure black for shape testing.
     */
    data class AuthoredSprite(
        val sprite: AuthoredSpriteModel,
    ) : DrawPayload

    /**
     * Renders a sprite from a sprite sheet (PNG pixel art).
     * The renderer looks up the image by [sheetId] and draws the region
     * defined by [srcX],[srcY],[srcW],[srcH] at the command's screenPos,
     * scaled by [scale]. Flipped horizontally if [flipX] is true.
     */
    data class Sprite(
        val sheetId: String,     // e.g. "player_human" — maps to a loaded PNG
        val srcX: Int,           // source rect X in the sheet
        val srcY: Int,           // source rect Y
        val srcW: Int,           // source rect width
        val srcH: Int,           // source rect height
        val scale: Float = 1f,
        val flipX: Boolean = false,
    ) : DrawPayload

    /**
     * Fills a polygon with a tiled texture from a sprite sheet.
     * The texture is tiled at [tileScale] to fill the polygon's bounding box,
     * then clipped to the polygon shape.
     * [tintArgb] if non-null applies a color tint over the texture.
     */
    data class TexturedPath(
        val points: List<Vec2f>,     // absolute screen coords — polygon clip shape
        val sheetId: String,         // texture sheet ID (e.g. "wall_castle")
        val tileScale: Float = 1f,   // scale factor for texture tiling
        val tintArgb: Int? = null,   // optional color tint overlay
    ) : DrawPayload
}
