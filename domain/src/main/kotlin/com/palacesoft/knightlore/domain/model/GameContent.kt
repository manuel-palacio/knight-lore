package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.RoomId

data class GameContent(
    val rooms: Map<RoomId, RoomDefinition>,
    val itemTypes: Map<String, ItemTypeDefinition>,
    val actorTypes: Map<String, ActorTypeDefinition>,
    val cureSequence: CureSequenceDefinition,
    val progression: ProgressionDefinition,
)

data class ItemTypeDefinition(
    val id: String,
    val family: ItemType,
    val displayName: String,
    val isCureRelevant: Boolean,
    val tier: Int,  // 1=early, 2=mid, 3=late
)

data class ActorTypeDefinition(
    val id: String,
    val kind: ActorKind,
    val patrolRadius: Float,
    val contactDamage: Int,
    val formReactive: Boolean,
)

enum class ActorKind { GUARD_PATROL, GHOST, SPIKE_BEAST, FORM_REACTIVE }

data class CureSequenceDefinition(
    val mode: CureMode,
    val sequence: List<ItemType>,
    val variableStartIndex: Boolean,
)

enum class CureMode { CLASSIC, MODERN }

data class ProgressionDefinition(
    val totalRequiredItems: Int,
    val startRoomId: RoomId,
    val cauldronRoomId: RoomId,
)
