package com.palacesoft.knightlore.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class EngineConfig(
    val ticksPerDay: Int = 3600,
    val playerLives: Int = 5,
    val transformDurationTicks: Int = 60,
)
