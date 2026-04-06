package com.example.knightlore.domain.system

import com.example.knightlore.domain.event.GameEvent
import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.DayPhase
import com.example.knightlore.domain.model.GameState
import com.example.knightlore.domain.model.TimeState

class TimeSystem : GameSystem {
    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val time = state.time
        var newTicksInDay = time.ticksInDay + 1
        var newDayIndex = time.dayIndex

        if (newTicksInDay >= time.ticksPerDay) {
            newTicksInDay = 0
            newDayIndex = time.dayIndex + 1
            if (newDayIndex > 39) {
                // Quest failed — 40 days elapsed
                return SystemResult(
                    state.copy(time = time.copy(ticksInDay = 0, dayIndex = 39, phase = DayPhase.DAY)),
                    listOf(GameEvent.GameOver)
                )
            }
        }

        val newTimeOfDay = newTicksInDay.toFloat() / time.ticksPerDay.toFloat()
        val newPhase = phaseFor(newTimeOfDay)

        val events = mutableListOf<GameEvent>()
        if (newPhase != time.phase) {
            // Emit TransformationStarted at phase boundaries that trigger form change
            if (newPhase == DayPhase.DUSK || newPhase == DayPhase.DAWN) {
                events += GameEvent.TransformationStarted
            }
        }

        val newTime = TimeState(
            dayIndex = newDayIndex,
            ticksInDay = newTicksInDay,
            ticksPerDay = time.ticksPerDay,
            phase = newPhase,
        )
        return SystemResult(state.copy(time = newTime), events)
    }

    private fun phaseFor(timeOfDay: Float): DayPhase = when {
        timeOfDay < 0.25f -> DayPhase.DAY
        timeOfDay < 0.40f -> DayPhase.DUSK
        timeOfDay < 0.75f -> DayPhase.NIGHT
        else              -> DayPhase.DAWN
    }
}
