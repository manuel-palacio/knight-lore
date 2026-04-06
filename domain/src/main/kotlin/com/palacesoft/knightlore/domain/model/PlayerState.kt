package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.core.math.Vec3f

enum class Form { HUMAN, WEREWULF }

enum class TransformPhase { STABLE, TRANSFORMING_TO_WEREWULF, TRANSFORMING_TO_HUMAN }

data class TransformState(
    val phase: TransformPhase,
    val progressTicks: Int,  // how many ticks into current phase
)

data class PlayerState(
    val form: Form,
    val position: Vec3f,
    val velocity: Vec3f,
    val facing: Direction8,
    val inventory: List<ItemId>,  // max 3 items
    val airborne: Boolean,
    val lives: Int,
    val transformState: TransformState,
    val damageCooldownTicks: Int,  // invincibility frames after hit
)
