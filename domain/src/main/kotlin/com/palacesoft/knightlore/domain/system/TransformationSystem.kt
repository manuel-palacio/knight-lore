package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.DayPhase
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.PlayerState
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.TransformState
import com.palacesoft.knightlore.core.math.Vec3f

private const val TRANSFORM_TICKS = 60

class TransformationSystem : GameSystem {
    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val player = state.player
        val phase = state.time.phase
        val transformState = player.transformState
        val events = mutableListOf<GameEvent>()

        var newTransformState = transformState
        var newForm = player.form
        var newVelocity = player.velocity

        // Begin transformation if at a phase boundary and not already transforming
        if (transformState.phase == TransformPhase.STABLE) {
            if (phase == DayPhase.DUSK && player.form == Form.HUMAN) {
                newTransformState = TransformState(TransformPhase.TRANSFORMING_TO_WEREWULF, 0)
            } else if (phase == DayPhase.DAWN && player.form == Form.WEREWULF) {
                newTransformState = TransformState(TransformPhase.TRANSFORMING_TO_HUMAN, 0)
            }
        }

        // Advance active transformation
        when (newTransformState.phase) {
            TransformPhase.TRANSFORMING_TO_WEREWULF -> {
                val ticks = newTransformState.progressTicks + 1
                newVelocity = Vec3f.ZERO
                if (ticks >= TRANSFORM_TICKS) {
                    newForm = Form.WEREWULF
                    newTransformState = TransformState(TransformPhase.STABLE, 0)
                    events += GameEvent.TransformationCompleted
                } else {
                    newTransformState = newTransformState.copy(progressTicks = ticks)
                }
            }
            TransformPhase.TRANSFORMING_TO_HUMAN -> {
                val ticks = newTransformState.progressTicks + 1
                newVelocity = Vec3f.ZERO
                if (ticks >= TRANSFORM_TICKS) {
                    newForm = Form.HUMAN
                    newTransformState = TransformState(TransformPhase.STABLE, 0)
                    events += GameEvent.TransformationCompleted
                } else {
                    newTransformState = newTransformState.copy(progressTicks = ticks)
                }
            }
            TransformPhase.STABLE -> { /* nothing to do */ }
        }

        val newPlayer = player.copy(
            form = newForm,
            velocity = newVelocity,
            transformState = newTransformState,
        )
        return SystemResult(state.copy(player = newPlayer), events)
    }
}
