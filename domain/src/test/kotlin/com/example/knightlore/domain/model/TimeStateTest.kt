package com.example.knightlore.domain.model

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class TimeStateTest {

    @Test
    fun timeState_requiresPositiveTicksPerDay() {
        assertThrows(IllegalArgumentException::class.java) {
            TimeState(
                tick = 0L,
                dayIndex = 0,
                ticksInDay = 0,
                ticksPerDay = 0,
                phase = DayPhase.DAY,
                phaseProgress = 0f,
                ticksUntilTransform = null,
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            TimeState(
                tick = 0L,
                dayIndex = 0,
                ticksInDay = 0,
                ticksPerDay = -1,
                phase = DayPhase.DAY,
                phaseProgress = 0f,
                ticksUntilTransform = null,
            )
        }
    }

    @Test
    fun timeState_rejectsDayIndexAbove39() {
        assertThrows(IllegalArgumentException::class.java) {
            TimeState(
                tick = 0L,
                dayIndex = 40,
                ticksInDay = 0,
                ticksPerDay = 100,
                phase = DayPhase.DAY,
                phaseProgress = 0f,
                ticksUntilTransform = null,
            )
        }
    }

    @Test
    fun timeState_rejectsTicksInDayOutOfRange() {
        // ticksInDay >= ticksPerDay should be rejected
        assertThrows(IllegalArgumentException::class.java) {
            TimeState(
                tick = 0L,
                dayIndex = 0,
                ticksInDay = 100,
                ticksPerDay = 100,
                phase = DayPhase.DAY,
                phaseProgress = 0f,
                ticksUntilTransform = null,
            )
        }
        // Negative value should also be rejected
        assertThrows(IllegalArgumentException::class.java) {
            TimeState(
                tick = 0L,
                dayIndex = 0,
                ticksInDay = -1,
                ticksPerDay = 100,
                phase = DayPhase.DAY,
                phaseProgress = 0f,
                ticksUntilTransform = null,
            )
        }
    }
}
