package com.palacesoft.knightlore.data.dto

import kotlinx.serialization.Serializable

@Serializable
data class ActorTypeDto(
    val id: String,
    val kind: String,         // maps to ActorKind enum name
    val patrolRadius: Float,
    val contactDamage: Int,
    val formReactive: Boolean,
)
