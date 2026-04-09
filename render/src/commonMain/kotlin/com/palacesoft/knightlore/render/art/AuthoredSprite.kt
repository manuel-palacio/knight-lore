package com.palacesoft.knightlore.render.art

import com.palacesoft.knightlore.core.math.Vec2f

/** A single polygon layer in an authored sprite. */
data class SpriteLayer(
    val points: List<Vec2f>,      // screen-space polygon points, relative to anchor
    val fillColor: Int,           // ARGB packed int
    val strokeColor: Int? = null,
    val zOffset: Float = 0f,
)

/** A multi-layer authored sprite. Anchor is the feet position (bottom-center). */
data class AuthoredSprite(
    val id: String,
    val layers: List<SpriteLayer>,
    val anchorOffsetY: Float = 0f, // positive = shift sprite up from anchor
)
