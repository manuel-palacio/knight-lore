package com.palacesoft.knightlore.domain

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Tests for [GameLoop] using [kotlinx.coroutines.test.runTest] with virtual time.
 *
 * The [GameLoop.deltaProvider] parameter is used to inject a deterministic per-frame
 * delta instead of [kotlin.time.TimeSource.Monotonic], making tests hermetic.
 *
 * Loop mechanics under virtual time:
 *  - [delay](1L) in the loop body yields control; [advanceTimeBy](N) runs N iterations.
 *  - maxStepsPerFrame = 5, so injecting a large delta clamps at 5 steps/frame.
 *  - Using deltaProvider = { fixedStepSeconds * 5 } → exactly 5 steps per frame.
 *    36 frames × 5 steps = 180 steps → advanceTimeBy(36) produces exactly 180 updates.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class GameLoopTest {

    /**
     * Fixed step count: 36 frames × 5 steps/frame = exactly 180 onUpdate calls.
     * Verified by injecting maxSteps-sized delta so the capping kicks in exactly.
     */
    @Test
    fun `fixed step count - 36 frames at maxSteps yields 180 onUpdate calls`() = runTest {
        val fixedHz = 60
        val fixedStep = 1f / fixedHz
        val updateCount = CountingCallback()
        val loop = GameLoop(
            fixedHz = fixedHz,
            onUpdate = { updateCount.invoke() },
            onRender = {},
            deltaProvider = { fixedStep * 5 },   // exactly 5 steps per frame (maxStepsPerFrame)
        )
        loop.start(this)
        advanceTimeBy(36L)   // 36 frames × 5 steps = 180 updates
        loop.stop()
        assertEquals(180, updateCount.count)
    }

    /**
     * Interpolation range: interpolation passed to onRender must always be in [0.0, 1.0].
     */
    @Test
    fun `interpolation is always in range 0 to 1`() = runTest {
        val outOfRange = mutableListOf<Float>()
        val fixedStep = 1f / 60
        val loop = GameLoop(
            fixedHz = 60,
            onUpdate = {},
            onRender = { interp ->
                if (interp < 0f || interp > 1f) outOfRange.add(interp)
            },
            deltaProvider = { fixedStep * 0.7f },   // partial step — exercises interpolation
        )
        loop.start(this)
        advanceTimeBy(500L)
        loop.stop()
        assertTrue(outOfRange.isEmpty(), "Found out-of-range interpolation values: $outOfRange")
    }

    /**
     * Pause/resume: onUpdate must not be called while paused, and must resume after resume().
     */
    @Test
    fun `onUpdate not called while paused and resumes correctly`() = runTest {
        val updateCount = CountingCallback()
        val fixedStep = 1f / 60
        val loop = GameLoop(
            fixedHz = 60,
            onUpdate = { updateCount.invoke() },
            onRender = {},
            deltaProvider = { fixedStep * 5 },   // 5 updates per frame
        )
        loop.start(this)

        // Advance a little to confirm the loop is running
        advanceTimeBy(10L)
        assertTrue(updateCount.count > 0, "Loop should have fired some updates before pause")

        loop.pause()
        assertEquals(GameLoop.State.PAUSED, loop.state)
        val countBeforePause = updateCount.count

        // Advance while paused — no updates expected
        advanceTimeBy(100L)
        assertEquals(
            countBeforePause,
            updateCount.count,
            "onUpdate was called ${updateCount.count - countBeforePause} times while paused",
        )

        // Resume and confirm updates continue
        loop.resume()
        assertEquals(GameLoop.State.RUNNING, loop.state)
        advanceTimeBy(10L)
        assertTrue(
            updateCount.count > countBeforePause,
            "onUpdate should have been called after resume but count stayed at ${updateCount.count}",
        )

        loop.stop()
    }

    /**
     * Stop: loop terminates after stop() and no further updates occur.
     */
    @Test
    fun `loop terminates after stop and no further updates occur`() = runTest {
        val updateCount = CountingCallback()
        val fixedStep = 1f / 60
        val loop = GameLoop(
            fixedHz = 60,
            onUpdate = { updateCount.invoke() },
            onRender = {},
            deltaProvider = { fixedStep * 5 },
        )
        loop.start(this)
        advanceTimeBy(10L)

        loop.stop()
        assertEquals(GameLoop.State.STOPPED, loop.state)

        val countAtStop = updateCount.count
        advanceTimeBy(100L)

        assertEquals(
            countAtStop,
            updateCount.count,
            "onUpdate was called after stop()",
        )
    }

    /**
     * Calling start() while already running is a no-op (does not double-launch).
     */
    @Test
    fun `start while already running has no effect`() = runTest {
        val fixedStep = 1f / 60
        val updateCount = CountingCallback()
        val loop = GameLoop(
            fixedHz = 60,
            onUpdate = { updateCount.invoke() },
            onRender = {},
            deltaProvider = { fixedStep * 5 },   // 5 updates per frame
        )
        loop.start(this)
        loop.start(this) // second call should be ignored

        advanceTimeBy(10L)   // 10 frames × 5 = 50 updates if single-launch
        loop.stop()

        // If double-launched, we'd get ~100 updates. Single-launch: 50.
        // Allow a small tolerance window.
        assertTrue(
            updateCount.count in 40..60,
            "Suspected double-launch: got ${updateCount.count} updates in 10 frames (expected ~50)",
        )
    }

    private class CountingCallback {
        var count: Int = 0
        fun invoke() { count++ }
    }
}
