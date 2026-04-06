package com.example.knightlore.core.time

/**
 * Fixed-step accumulator clock.
 *
 * Usage:
 * 1. Call [advance] each frame with the real elapsed time.
 * 2. Call [consumeStep] in a loop to drive fixed-step simulation ticks.
 * 3. Use [interpolationFactor] to smoothly interpolate rendering between steps.
 */
class GameClock(private val fixedStepSeconds: Float) {

    private var accumulator: Float = 0f

    /** Call each frame with the real delta time in seconds. */
    fun advance(deltaSeconds: Float) {
        accumulator += deltaSeconds
    }

    /**
     * Returns `true` and consumes one fixed step if enough time has accumulated.
     * Call in a loop until it returns `false`.
     */
    fun consumeStep(): Boolean {
        return if (accumulator >= fixedStepSeconds) {
            accumulator -= fixedStepSeconds
            true
        } else {
            false
        }
    }

    /**
     * Interpolation factor in [0.0, 1.0] representing how far through the current
     * fixed step the renderer is. Use this to interpolate entity positions for
     * smooth rendering even at variable frame rates.
     */
    fun interpolationFactor(): Float = (accumulator / fixedStepSeconds).coerceIn(0f, 1f)

    /** Resets the accumulator. Call when pausing or resuming to avoid a burst of steps. */
    fun reset() {
        accumulator = 0f
    }
}
