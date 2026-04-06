package com.palacesoft.knightlore.app.settings

data class GameSettings(
    val audioEnabled: Boolean = true,
    val difficulty: Difficulty = Difficulty.MODERN,
    val debugOverlayEnabled: Boolean = false,
)

enum class Difficulty { CLASSIC, MODERN }
