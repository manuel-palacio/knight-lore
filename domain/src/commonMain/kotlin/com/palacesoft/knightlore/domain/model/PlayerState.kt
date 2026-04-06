package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.core.math.Vec3f
import kotlinx.serialization.Serializable

@Serializable
enum class Form { HUMAN, WEREWULF }

@Serializable
enum class TransformPhase { STABLE, TRANSFORMING_TO_WEREWULF, TRANSFORMING_TO_HUMAN, RECOVERING }

@Serializable
enum class MovementState { IDLE, WALKING, JUMP_ASCENT, JUMP_DESCENT, LANDING, TRANSFORMING }

@Serializable
data class TransformState(
    val phase: TransformPhase,
    val progressTicks: Int,  // how many ticks into current phase
)

@Serializable
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
    val jumpLockTicks: Int = 0,   // anti-double-jump cooldown
    val movementState: MovementState = MovementState.IDLE,
)
