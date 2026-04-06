package com.example.knightlore.domain.model

import com.example.knightlore.core.ids.RoomId

data class GameContent(
    val rooms: Map<RoomId, RoomDefinition> = emptyMap(),
    // TODO Phase 2: add itemTypes, actorTypes, themeSet, progression
)
