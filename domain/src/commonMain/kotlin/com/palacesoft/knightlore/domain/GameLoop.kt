package com.palacesoft.knightlore.domain

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicReference
import kotlin.time.TimeSource

/**
 * Fixed-timestep game loop.
 *
 * Physics updates run at exactly [fixedHz] per second.
 * Render callbacks receive an [interpolation] value (0.0–1.0) for smooth
 * sub-tick sprite interpolation between the previous and current physics state.
 *
 * States: IDLE -> RUNNING <-> PAUSED -> STOPPED
 *
 * @param deltaProvider Optional override for the per-frame delta in seconds.
 *   When null (the default) the loop measures real elapsed time via
 *   [TimeSource.Monotonic]. Tests can inject a fixed value (e.g. `{ 0.001f }`)
 *   to drive the accumulator predictably alongside [advanceTimeBy].
 */
class GameLoop(
    private val fixedHz: Int = 60,
    private val onUpdate: (deltaSeconds: Float) -> Unit,
    private val onRender: (interpolation: Float) -> Unit,
    private val deltaProvider: (() -> Float)? = null,
) {

    enum class State { IDLE, RUNNING, PAUSED, STOPPED }

    /** Maximum physics steps processed in a single frame to prevent spiral of death. */
    private val maxStepsPerFrame = 5

    val fixedStepSeconds: Float = 1f / fixedHz

    private val _state = AtomicReference(State.IDLE)

    val state: State
        get() = _state.get()

    /**
     * Starts the game loop as a coroutine on the given [scope].
     * Calling [start] while already running has no effect.
     */
    fun start(scope: CoroutineScope) {
        if (!_state.compareAndSet(State.IDLE, State.RUNNING)) return

        scope.launch {
            val timeSource = TimeSource.Monotonic
            var lastMark = timeSource.markNow()
            var accumulator = 0f

            while (isActive && _state.get() != State.STOPPED) {
                // Compute delta: use injected provider (for tests) or real wall time
                val rawDelta: Float = if (deltaProvider != null) {
                    deltaProvider.invoke()
                } else {
                    val now = timeSource.markNow()
                    val elapsed = (now - lastMark).inWholeNanoseconds / 1_000_000_000f
                    lastMark = now
                    elapsed
                }

                if (_state.get() == State.RUNNING) {
                    // Cap delta to prevent spiral of death (max fixedStep * maxStepsPerFrame)
                    val delta = rawDelta.coerceAtMost(fixedStepSeconds * maxStepsPerFrame)
                    accumulator += delta

                    var steps = 0
                    while (accumulator >= fixedStepSeconds && steps < maxStepsPerFrame) {
                        onUpdate(fixedStepSeconds)
                        accumulator -= fixedStepSeconds
                        steps++
                    }

                    val interpolation = (accumulator / fixedStepSeconds).coerceIn(0f, 1f)
                    onRender(interpolation)
                }

                // Yield to prevent busy-looping; actual rate governed by accumulator
                delay(1L)
            }
        }
    }

    /** Pauses physics updates. [onRender] is also suppressed while paused. */
    fun pause() {
        _state.compareAndSet(State.RUNNING, State.PAUSED)
    }

    /** Resumes a paused loop. */
    fun resume() {
        _state.compareAndSet(State.PAUSED, State.RUNNING)
    }

    /** Stops the loop permanently. Cannot be restarted after calling [stop]. */
    fun stop() {
        _state.set(State.STOPPED)
    }
}
