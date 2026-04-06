package com.palacesoft.knightlore.domain.rules

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.domain.model.RoomDefinition

interface RoomProvider {
    fun getRoom(id: RoomId): RoomDefinition?
}
