package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.RoomId
import kotlinx.serialization.Serializable

@Serializable
enum class TransitionPhase { FADING_OUT, FADING_IN, SLIDING_OUT, SLIDING_IN }

@Serializable
data class RoomTransitionState(
    val fromRoomId: RoomId,
    val toRoomId: RoomId,
    val targetSpawnId: String,
    val phase: TransitionPhase,
    val ticksRemaining: Int,
    val exitSide: ExitSide = ExitSide.NORTH,
    val totalTicks: Int = 20,
)
