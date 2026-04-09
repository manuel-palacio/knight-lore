package com.palacesoft.knightlore.render.art

import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.MovementState

/**
 * Returns authored sprite data for player characters.
 * Returns null for any unimplemented combination → legacy rendering fallback.
 */
interface ActorArtCatalog {
    fun resolvePlayer(
        form: Form,
        motion: MovementState,
        facing: Direction8,
        framePhase: Int,
        tick: Long = 0L,
    ): AuthoredSprite?
}
