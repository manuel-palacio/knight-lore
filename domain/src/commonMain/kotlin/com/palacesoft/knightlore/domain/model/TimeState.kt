package com.palacesoft.knightlore.domain.model

enum class DayPhase { DAY, DUSK, NIGHT, DAWN }

data class TimeState(
    val tick: Long,                      // absolute tick counter since game start
    val dayIndex: Int,                   // 0-based, max 39
    val ticksInDay: Int,                 // current tick within this day
    val ticksPerDay: Int,                // total ticks per full day cycle
    val phase: DayPhase,
    val phaseProgress: Float,            // 0.0..1.0 within current phase
    val ticksUntilTransform: Int?,       // null if no transform imminent; counts down to 0
) {
    val timeOfDay: Float get() = ticksInDay.toFloat() / ticksPerDay.toFloat()

    init {
        require(ticksPerDay > 0) { "ticksPerDay must be positive, got $ticksPerDay" }
        require(dayIndex in 0..39) { "dayIndex $dayIndex out of range [0, 39]" }
        require(ticksInDay in 0 until ticksPerDay) { "ticksInDay $ticksInDay out of range [0, $ticksPerDay)" }
    }
}
