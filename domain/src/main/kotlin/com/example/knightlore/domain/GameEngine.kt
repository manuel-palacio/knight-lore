package com.example.knightlore.domain

import com.example.knightlore.domain.event.GameEvent
import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.GameState
import com.example.knightlore.domain.system.GameSystem

class GameEngine(
    private val systems: List<GameSystem>,
) {
    fun update(state: GameState, input: FrameInput, tickDelta: Float): Pair<GameState, List<GameEvent>> {
        var current = state
        val allEvents = mutableListOf<GameEvent>()
        for (system in systems) {
            val result = system.update(current, input, tickDelta)
            current = result.state
            allEvents += result.events
        }
        return current to allEvents
    }
}
