package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState

interface GameSystem {
    fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult
}

data class SystemResult(
    val state: GameState,
    val events: List<GameEvent> = emptyList(),
)
