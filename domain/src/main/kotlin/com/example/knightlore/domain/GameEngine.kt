package com.example.knightlore.domain

import com.example.knightlore.domain.event.GameEvent
import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.GameState
import com.example.knightlore.domain.system.GameSystem

/**
 * Systems must run in this order for correct state propagation:
 * 1. TimeSystem — advances clock, updates DayPhase, emits TransformationStarted notification
 * 2. TransformationSystem — reads updated phase, drives the transformation state machine
 * 3. MovementSystem — reads transformState to suppress input during transformation
 * 4. RoomTransitionSystem — handles room changes after movement
 *
 * TransformationStarted from TimeSystem is an audio/visual notification only.
 * TransformationSystem drives the actual state machine autonomously based on DayPhase.
 */
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
