package com.palacesoft.knightlore.domain.event

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.domain.model.ItemType

sealed interface GameEvent {
    data object JumpStarted : GameEvent
    data object Landed : GameEvent
    data object TransformationStarted : GameEvent
    data object TransformationCompleted : GameEvent
    data class ItemPickedUp(val itemId: ItemId) : GameEvent
    data class ItemDropped(val itemId: ItemId) : GameEvent
    data object PlayerDamaged : GameEvent
    data object LifeLost : GameEvent
    data class EnteredRoom(val roomId: RoomId) : GameEvent
    data class CauldronRequestAdvanced(val itemType: ItemType) : GameEvent
    data object GameOver : GameEvent
    data object QuestCompleted : GameEvent
    data object FootstepStone : GameEvent
    data object FootstepWater : GameEvent
    data object BlockPushStart : GameEvent
    data object BlockScrape : GameEvent
}
