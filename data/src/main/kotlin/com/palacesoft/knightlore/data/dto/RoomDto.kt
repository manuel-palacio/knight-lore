package com.palacesoft.knightlore.data.dto

import kotlinx.serialization.Serializable

@Serializable
data class RoomDto(
    val id: String,
    val width: Int,
    val depth: Int,
    val height: Int,
    val theme: String,
    val special: String? = null,
    val tiles: List<TileStackDto> = emptyList(),
    val interactives: List<InteractiveDto> = emptyList(),
    val exits: List<RoomExitDto> = emptyList(),
    val itemAnchors: List<ItemAnchorDto> = emptyList(),
    val actorSpawns: List<ActorSpawnDto> = emptyList(),
)

@Serializable
data class TileStackDto(val x: Int, val y: Int, val z: Int, val type: String)

@Serializable
data class InteractiveDto(val id: String, val x: Float, val y: Float, val z: Float, val kind: String)

@Serializable
data class RoomExitDto(val side: String, val targetRoomId: String, val targetSpawnId: String)

@Serializable
data class ItemAnchorDto(val itemId: String, val x: Float, val y: Float, val z: Float)

@Serializable
data class ActorSpawnDto(val actorType: String, val x: Float, val y: Float, val z: Float)
