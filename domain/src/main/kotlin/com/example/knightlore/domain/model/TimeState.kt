package com.example.knightlore.domain.model

enum class DayPhase { DAY, DUSK, NIGHT, DAWN }

data class TimeState(
    val dayIndex: Int,          // 0-based, max 39 (40 days)
    val ticksInDay: Int,        // current tick within this day
    val ticksPerDay: Int,       // total ticks per full day cycle
    val phase: DayPhase,
) {
    init {
        require(ticksPerDay > 0) { "ticksPerDay must be positive, got $ticksPerDay" }
        require(dayIndex >= 0) { "dayIndex must be non-negative, got $dayIndex" }
        require(ticksInDay in 0 until ticksPerDay) { "ticksInDay $ticksInDay out of range [0, $ticksPerDay)" }
    }

    val timeOfDay: Float get() = ticksInDay.toFloat() / ticksPerDay.toFloat()
}
