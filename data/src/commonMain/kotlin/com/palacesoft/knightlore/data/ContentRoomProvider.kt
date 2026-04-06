package com.palacesoft.knightlore.data

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.rules.RoomProvider

class ContentRoomProvider(private val content: GameContent) : RoomProvider {
    override fun getRoom(id: RoomId): RoomDefinition? = content.rooms[id]
}
