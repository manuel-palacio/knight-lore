package com.example.knightlore.domain.system

import com.example.knightlore.domain.testGameState
import com.example.knightlore.domain.testTimeState
import com.example.knightlore.domain.event.GameEvent
import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.DayPhase
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class TimeSystemTest {

    private val system = TimeSystem()
    private val idle = FrameInput.IDLE

    @Test
    fun timeSystem_advancesTick_eachUpdate() {
        val state = testGameState(time = testTimeState(tick = 0L, ticksInDay = 0))
        val result = system.update(state, idle, 1f / 60f)
        assertEquals(1L, result.state.time.tick)
        assertEquals(1, result.state.time.ticksInDay)
    }

    @Test
    fun timeSystem_wrapsToNextDay_atEndOfDay() {
        val ticksPerDay = 100
        val state = testGameState(
            time = testTimeState(ticksPerDay = ticksPerDay, ticksInDay = ticksPerDay - 1, dayIndex = 0)
        )
        val result = system.update(state, idle, 1f / 60f)
        assertEquals(1, result.state.time.dayIndex)
        assertEquals(0, result.state.time.ticksInDay)
    }

    @Test
    fun timeSystem_entersNight_afterDusk() {
        // DUSK spans timeOfDay 0.25..0.40, so NIGHT starts at 0.40 * ticksPerDay
        val ticksPerDay = 1000
        val nightStartTick = (0.40f * ticksPerDay).toInt() - 1  // one tick before NIGHT
        val state = testGameState(
            time = testTimeState(ticksPerDay = ticksPerDay, ticksInDay = nightStartTick, phase = DayPhase.DUSK)
        )
        val result = system.update(state, idle, 1f / 60f)
        assertEquals(DayPhase.NIGHT, result.state.time.phase)
    }

    @Test
    fun timeSystem_emitsGameOver_onDay40Expiry() {
        val ticksPerDay = 100
        // Place at the very last tick of day 39
        val state = testGameState(
            time = testTimeState(ticksPerDay = ticksPerDay, ticksInDay = ticksPerDay - 1, dayIndex = 39)
        )
        val result = system.update(state, idle, 1f / 60f)
        assertTrue(result.events.contains(GameEvent.GameOver))
    }

    @Test
    fun timeSystem_ticksUntilTransform_nonNull_duringDusk() {
        val ticksPerDay = 1000
        // Somewhere in DUSK phase (ticksInDay in [250, 400))
        val duskTick = 300
        val state = testGameState(
            time = testTimeState(ticksPerDay = ticksPerDay, ticksInDay = duskTick, phase = DayPhase.DUSK)
        )
        val result = system.update(state, idle, 1f / 60f)
        assertNotNull(result.state.time.ticksUntilTransform)
        assertTrue(result.state.time.ticksUntilTransform!! > 0)
    }

    @Test
    fun timeSystem_ticksUntilTransform_null_duringDay() {
        val ticksPerDay = 1000
        val dayTick = 100  // well within DAY phase (< 250)
        val state = testGameState(
            time = testTimeState(ticksPerDay = ticksPerDay, ticksInDay = dayTick, phase = DayPhase.DAY)
        )
        val result = system.update(state, idle, 1f / 60f)
        assertNull(result.state.time.ticksUntilTransform)
    }
}
