package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.DayPhase
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.TimeState

// Phase boundaries (as fraction of ticksPerDay)
private const val DUSK_START = 0.25f
private const val NIGHT_START = 0.40f
private const val DAWN_START = 0.75f
// DAY starts at 0.0 / 1.0 (day rollover)

class TimeSystem : GameSystem {
    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val time = state.time
        var newTicksInDay = time.ticksInDay + 1
        var newDayIndex = time.dayIndex
        val newTick = time.tick + 1L

        if (newTicksInDay >= time.ticksPerDay) {
            newTicksInDay = 0
            newDayIndex = time.dayIndex + 1
            if (newDayIndex > 39) {
                // Quest failed — 40 days elapsed
                val gameOverTime = time.copy(
                    tick = newTick,
                    ticksInDay = 0,
                    dayIndex = 39,
                    phase = DayPhase.DAY,
                    phaseProgress = 0f,
                    ticksUntilTransform = null,
                )
                return SystemResult(
                    state.copy(time = gameOverTime),
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

        val phaseProgress = computePhaseProgress(newTimeOfDay, newPhase)
        val ticksUntilTransform = computeTicksUntilTransform(newTicksInDay, newPhase, time.ticksPerDay)

        val newTime = TimeState(
            tick = newTick,
            dayIndex = newDayIndex,
            ticksInDay = newTicksInDay,
            ticksPerDay = time.ticksPerDay,
            phase = newPhase,
            phaseProgress = phaseProgress,
            ticksUntilTransform = ticksUntilTransform,
        )
        return SystemResult(state.copy(time = newTime), events)
    }

    private fun phaseFor(timeOfDay: Float): DayPhase = when {
        timeOfDay < DUSK_START  -> DayPhase.DAY
        timeOfDay < NIGHT_START -> DayPhase.DUSK
        timeOfDay < DAWN_START  -> DayPhase.NIGHT
        else                    -> DayPhase.DAWN
    }

    private fun computePhaseProgress(timeOfDay: Float, phase: DayPhase): Float = when (phase) {
        DayPhase.DAY  -> timeOfDay / DUSK_START
        DayPhase.DUSK -> (timeOfDay - DUSK_START) / (NIGHT_START - DUSK_START)
        DayPhase.NIGHT -> (timeOfDay - NIGHT_START) / (DAWN_START - NIGHT_START)
        DayPhase.DAWN -> (timeOfDay - DAWN_START) / (1.0f - DAWN_START)
    }.coerceIn(0f, 1f)

    /**
     * Returns ticks remaining until end of DUSK (→ NIGHT) or end of DAWN (→ DAY).
     * Null outside those two phases.
     */
    private fun computeTicksUntilTransform(ticksInDay: Int, phase: DayPhase, ticksPerDay: Int): Int? {
        return when (phase) {
            DayPhase.DUSK -> {
                val nightStartTick = (NIGHT_START * ticksPerDay).toInt()
                (nightStartTick - ticksInDay).coerceAtLeast(0)
            }
            DayPhase.DAWN -> {
                val dayEndTick = ticksPerDay
                (dayEndTick - ticksInDay).coerceAtLeast(0)
            }
            else -> null
        }
    }
}
