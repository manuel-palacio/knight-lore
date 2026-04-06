package com.palacesoft.knightlore.data.dto

import kotlinx.serialization.Serializable

@Serializable
data class ProgressionDto(
    val totalRequiredItems: Int,
    val startRoomId: String,
    val cauldronRoomId: String,
    val cureMode: String = "MODERN",
    val sequence: List<String>,  // ItemType enum names in order
    val variableStartIndex: Boolean = false,
)
