package com.palacesoft.knightlore.domain.model

data class EngineConfig(
    val ticksPerDay: Int = 3600,
    val playerLives: Int = 5,
    val transformDurationTicks: Int = 60,
)
