package com.example.knightlore.domain.model

enum class DayPhase { DAY, DUSK, NIGHT, DAWN }

data class TimeState(
    val dayIndex: Int,          // 0-based, max 39 (40 days)
    val ticksInDay: Int,        // current tick within this day
    val ticksPerDay: Int,       // total ticks per full day cycle
    val phase: DayPhase,
) {
    val timeOfDay: Float get() = ticksInDay.toFloat() / ticksPerDay.toFloat()
}
