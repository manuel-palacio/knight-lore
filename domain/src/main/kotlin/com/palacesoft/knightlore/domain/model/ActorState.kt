package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.ActorId
import com.palacesoft.knightlore.core.math.Vec3f

enum class ActorBehavior { PATROL, STATIC_HAZARD, REACTIVE }

enum class ActorType {
    GUARD, GHOST, ROBOT, DRUID, BALL, CAULDRON_GUARDIAN
}

data class ActorState(
    val id: ActorId,
    val type: ActorType,
    val position: Vec3f,
    val velocity: Vec3f,
    val behaviorState: String,  // behavior-specific state label (e.g. "PATROL_LEFT")
    val behavior: ActorBehavior,
    val form: Form?,            // null = not form-sensitive
    val spawnPosition: Vec3f = Vec3f.ZERO,  // reference position for patrol bounds
)
