package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.RoomId

enum class TransitionPhase { FADING_OUT, FADING_IN }

data class RoomTransitionState(
    val fromRoomId: RoomId,
    val toRoomId: RoomId,
    val targetSpawnId: String,
    val phase: TransitionPhase,
    val ticksRemaining: Int,
)
