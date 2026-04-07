package com.palacesoft.knightlore.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class EngineConfig(
    val ticksPerDay: Int = 10800,   // 180 s per day at 60 fps (3-minute day cycle)
    val playerLives: Int = 5,
    val transformDurationTicks: Int = 60,
)
