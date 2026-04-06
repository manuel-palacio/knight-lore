package com.palacesoft.knightlore.app.session

import com.palacesoft.knightlore.domain.GameEngine
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Drives the fixed-step game simulation.
 *
 * Call [advance] each frame with the real elapsed delta in seconds.
 * The coordinator uses a fixed-step accumulator to run the domain engine
 * at [ticksPerSecond] regardless of the Android frame rate.
 *
 * Max delta is clamped to [maxDeltaSeconds] to prevent the spiral-of-death
 * when the app is resumed after a long pause.
 */
class GameLoopCoordinator(
    private val engine: GameEngine,
    initialState: GameState,
    private val ticksPerSecond: Int = 60,
    private val maxDeltaSeconds: Float = 0.5f,  // max 30 ticks catch-up
) {
    private val fixedStep: Float = 1f / ticksPerSecond

    private val _state = MutableStateFlow(initialState)
    val state: StateFlow<GameState> = _state

    private var accumulator: Float = 0f
    private var currentInput: FrameInput = FrameInput.IDLE

    /** Update the input to be consumed by the next tick(s). */
    fun submitInput(input: FrameInput) {
        currentInput = input
    }

    /**
     * Advance the simulation by [deltaSeconds] real time.
     * Runs as many fixed ticks as accumulated. Should be called from a
     * coroutine on the game thread (e.g., Choreographer callback or
     * a dedicated coroutine dispatcher).
     *
     * @return list of all events emitted this frame (across all ticks)
     */
    fun advance(deltaSeconds: Float): List<GameEvent> {
        accumulator += deltaSeconds.coerceAtMost(maxDeltaSeconds)
        val allEvents = mutableListOf<GameEvent>()

        while (accumulator >= fixedStep) {
            val result = engine.update(_state.value, currentInput, fixedStep)
            _state.value = result.state
            allEvents += result.events
            accumulator -= fixedStep

            // Reset single-frame inputs after first consumption
            if (currentInput.jumpPressed || currentInput.actionPressed ||
                currentInput.dropPressed || currentInput.cycleInventoryPressed) {
                currentInput = currentInput.copy(
                    jumpPressed = false,
                    actionPressed = false,
                    dropPressed = false,
                    cycleInventoryPressed = false,
                )
            }
        }

        return allEvents
    }

    /** Interpolation factor for smooth rendering between ticks (0.0..1.0). */
    fun interpolationFactor(): Float = (accumulator / fixedStep).coerceIn(0f, 1f)

    fun reset(newState: GameState) {
        _state.value = newState
        accumulator = 0f
        currentInput = FrameInput.IDLE
    }
}
