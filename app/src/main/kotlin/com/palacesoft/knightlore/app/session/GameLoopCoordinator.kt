package com.palacesoft.knightlore.app.session

import com.palacesoft.knightlore.domain.GameEngine
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.concurrent.atomic.AtomicReference

/**
 * Drives the fixed-step game simulation.
 *
 * Call [advance] each frame with the real elapsed delta in seconds.
 * The coordinator uses a fixed-step accumulator to run the domain engine
 * at [ticksPerSecond] regardless of the Android frame rate.
 *
 * Max delta is clamped to [maxDeltaSeconds] to prevent the spiral-of-death
 * when the app is resumed after a long pause.
 *
 * Thread-safety: [reset] may be called from any thread. It queues the new state
 * as a pending reset; [advance] applies it atomically at the start of the next
 * frame so the simulation thread never races against the reset caller.
 */
class GameLoopCoordinator(
    private var engine: GameEngine,
    initialState: GameState,
    private val ticksPerSecond: Int = 60,
    private val maxDeltaSeconds: Float = 0.5f,  // max 30 ticks catch-up
) {
    private data class PendingReset(val state: GameState, val engine: GameEngine?)

    private val fixedStep: Float = 1f / ticksPerSecond

    private val _state = MutableStateFlow(initialState)
    val state: StateFlow<GameState> = _state

    private var accumulator: Float = 0f
    private var currentInput: FrameInput = FrameInput.IDLE

    // Written from any thread, consumed by advance() on the simulation thread
    private val pendingReset = AtomicReference<PendingReset?>(null)

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
        // Apply any pending reset atomically before running simulation ticks.
        // This avoids a race where reset() on an IO thread overwrites state
        // that advance() just computed on the frame thread.
        pendingReset.getAndSet(null)?.let { reset ->
            if (reset.engine != null) engine = reset.engine
            _state.value = reset.state
            accumulator = 0f
            currentInput = FrameInput.IDLE
            return emptyList()  // skip this frame so the new state renders cleanly
        }

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

    /**
     * Schedules a full reset of the simulation. Safe to call from any thread.
     * The reset is applied at the start of the next [advance] call.
     */
    fun reset(newState: GameState, newEngine: GameEngine? = null) {
        pendingReset.set(PendingReset(newState, newEngine))
    }
}
