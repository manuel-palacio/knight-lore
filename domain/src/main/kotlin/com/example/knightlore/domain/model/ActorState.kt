package com.example.knightlore.domain.model

import com.example.knightlore.core.ids.ActorId
import com.example.knightlore.core.math.Vec3f

enum class ActorBehavior { PATROL, STATIC_HAZARD, REACTIVE }

data class ActorState(
    val id: ActorId,
    val type: String,
    val position: Vec3f,
    val velocity: Vec3f,
    val behaviorState: String,  // behavior-specific state label (e.g. "PATROL_LEFT")
    val behavior: ActorBehavior,
    val form: Form?,            // null = not form-sensitive
)
