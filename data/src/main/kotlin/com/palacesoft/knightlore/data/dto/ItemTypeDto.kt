package com.palacesoft.knightlore.data.dto

import kotlinx.serialization.Serializable

@Serializable
data class ItemTypeDto(
    val id: String,
    val family: String,       // maps to ItemType enum name
    val displayName: String,
    val isCureRelevant: Boolean,
    val tier: Int,
)
