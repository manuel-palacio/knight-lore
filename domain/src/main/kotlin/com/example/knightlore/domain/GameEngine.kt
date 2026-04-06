package com.example.knightlore.domain

import com.example.knightlore.domain.event.GameEvent
import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.GameContent
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
interface GameEngine {
    fun initialize(seed: Long, content: GameContent): GameState
    fun update(previous: GameState, input: FrameInput, deltaSeconds: Float): GameTickResult
}

data class GameTickResult(
    val state: GameState,
    val events: List<GameEvent>,
)

class DefaultGameEngine(private val systems: List<GameSystem>) : GameEngine {
    override fun initialize(seed: Long, content: GameContent): GameState {
        // TODO Phase 2: load from content
        // For now, return a stub initial state using seed
        TODO("Implemented in Phase 2 when ContentRepository exists")
    }

    override fun update(previous: GameState, input: FrameInput, deltaSeconds: Float): GameTickResult {
        var current = previous
        val allEvents = mutableListOf<GameEvent>()
        for (system in systems) {
            val result = system.update(current, input, deltaSeconds)
            current = result.state
            allEvents += result.events
        }
        return GameTickResult(current, allEvents)
    }
}
