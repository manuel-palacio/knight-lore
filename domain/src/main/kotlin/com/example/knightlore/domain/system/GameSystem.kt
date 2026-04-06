package com.example.knightlore.domain.system

import com.example.knightlore.domain.event.GameEvent
import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.GameState

interface GameSystem {
    fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult
}

data class SystemResult(
    val state: GameState,
    val events: List<GameEvent> = emptyList(),
)
