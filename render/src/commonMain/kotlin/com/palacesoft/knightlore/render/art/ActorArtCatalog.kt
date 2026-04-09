package com.palacesoft.knightlore.render.art

import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.MovementState

/**
 * Returns authored sprite data for player characters.
 * Returns null for any unimplemented combination → legacy rendering fallback.
 */
/**
 * Sprite-based player frame reference.
 * Maps to DrawPayload.Sprite for PNG sprite sheet rendering.
 */
data class PlayerSpriteRef(
    val sheetId: String,
    val srcX: Int, val srcY: Int, val srcW: Int, val srcH: Int,
    val scale: Float = 2f,  // 2x scale for visibility
    val flipX: Boolean = false,
)

interface ActorArtCatalog {
    fun resolvePlayer(
        form: Form,
        motion: MovementState,
        facing: Direction8,
        framePhase: Int,
        tick: Long = 0L,
    ): AuthoredSprite?

    /** Returns a sprite sheet frame reference, or null for legacy fallback. */
    fun resolvePlayerSprite(
        form: Form,
        motion: MovementState,
        facing: Direction8,
        framePhase: Int,
    ): PlayerSpriteRef? = null  // default: no sprite, use polygon fallback
}
