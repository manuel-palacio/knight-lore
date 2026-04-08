package com.palacesoft.knightlore.render.art

import com.palacesoft.knightlore.core.math.Vec2f

enum class PaletteRole {
    BODY_MAIN, BODY_SHADOW, BODY_HIGHLIGHT,
    METAL, CLOTH, TRIM,
    EYE_ACCENT, CURSE_GLOW, OUTLINE_SOFT,
}

data class SpriteAnchor(val x: Float, val y: Float)

data class AuthoredLayer(
    val id: String,
    val points: List<Vec2f> = emptyList(),
    val fillRole: PaletteRole,
    val alpha: Float = 1f,
    val isOval: Boolean = false,
    val width: Float = 0f,
    val height: Float = 0f,
)

data class AuthoredSprite(
    val id: String,
    val width: Float,
    val height: Float,
    val anchor: SpriteAnchor,
    val layers: List<AuthoredLayer>,
)
