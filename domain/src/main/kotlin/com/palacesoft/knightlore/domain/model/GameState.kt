package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.RoomId

data class GameState(
    val currentRoomId: RoomId,
    val player: PlayerState,
    val time: TimeState,
    val cauldron: CauldronState,
    val itemInstances: List<ItemInstance>,
    val actorStates: List<ActorState>,
    val roomTransition: RoomTransitionState?,
)
