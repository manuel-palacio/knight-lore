package com.example.knightlore.core.time

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class GameClockTest {

    @Test
    fun gameClock_advance_accumulatesTime() {
        val clock = GameClock(fixedStepSeconds = 1f / 60f)
        clock.advance(0.1f)
        // After advancing 0.1s with a 1/60s step, accumulator > 0
        // We can verify indirectly: interpolationFactor > 0
        assertTrue(clock.interpolationFactor() > 0f)
    }

    @Test
    fun gameClock_consumeStep_returnsTrueWhenReady() {
        val clock = GameClock(fixedStepSeconds = 1f / 60f)
        clock.advance(1f / 60f)
        assertTrue(clock.consumeStep())
    }

    @Test
    fun gameClock_consumeStep_returnsFalseWhenNotReady() {
        val clock = GameClock(fixedStepSeconds = 1f / 60f)
        // Not enough time accumulated
        clock.advance(0.001f)
        // Consume whatever is ready
        while (clock.consumeStep()) { /* drain */ }
        assertFalse(clock.consumeStep())
    }

    @Test
    fun gameClock_interpolationFactor_between0And1() {
        val clock = GameClock(fixedStepSeconds = 0.016f)
        clock.advance(0.008f)
        val factor = clock.interpolationFactor()
        assertTrue(factor in 0f..1f, "Expected factor in [0,1] but was $factor")
    }

    @Test
    fun gameClock_advance_clampedAtMaxDelta_preventsSpiral() {
        val step = 1f / 60f
        val clock = GameClock(fixedStepSeconds = step)
        // Advance with a huge spike (simulates app being backgrounded for 10 seconds)
        clock.advance(10f)
        // Max accumulator is 8 steps; after draining those 8, should be done
        var count = 0
        while (clock.consumeStep()) { count++ }
        assertEquals(8, count, "Should be clamped to 8 steps max")
    }

    @Test
    fun gameClock_invalidFixedStep_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException::class.java) {
            GameClock(fixedStepSeconds = 0f)
        }
        assertThrows(IllegalArgumentException::class.java) {
            GameClock(fixedStepSeconds = -1f)
        }
    }
}
