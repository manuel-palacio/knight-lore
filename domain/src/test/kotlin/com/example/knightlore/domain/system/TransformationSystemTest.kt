package com.example.knightlore.domain.system

import com.example.knightlore.domain.testGameState
import com.example.knightlore.domain.testPlayerState
import com.example.knightlore.domain.testTimeState
import com.example.knightlore.domain.event.GameEvent
import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.DayPhase
import com.example.knightlore.domain.model.Form
import com.example.knightlore.domain.model.TransformPhase
import com.example.knightlore.domain.model.TransformState
import com.example.knightlore.core.math.Vec3f
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

private const val TRANSFORM_TICKS = 60

class TransformationSystemTest {

    private val system = TransformationSystem()
    private val idle = FrameInput.IDLE

    @Test
    fun transformSystem_beginsTransform_atDusk() {
        val state = testGameState(
            player = testPlayerState(form = Form.HUMAN, transformState = TransformState(TransformPhase.STABLE, 0)),
            time = testTimeState(phase = DayPhase.DUSK),
        )
        val result = system.update(state, idle, 1f / 60f)
        assertEquals(TransformPhase.TRANSFORMING_TO_WEREWULF, result.state.player.transformState.phase)
    }

    @Test
    fun transformSystem_completesTransform_after60Ticks() {
        // Start TRANSFORMING_TO_WEREWULF with DUSK phase
        var state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                transformState = TransformState(TransformPhase.TRANSFORMING_TO_WEREWULF, 0),
            ),
            time = testTimeState(phase = DayPhase.DUSK),
        )

        // Advance 59 ticks — still transforming
        repeat(TRANSFORM_TICKS - 1) {
            state = system.update(state, idle, 1f / 60f).state
        }
        assertEquals(TransformPhase.TRANSFORMING_TO_WEREWULF, state.player.transformState.phase)

        // 60th tick — completes
        val result = system.update(state, idle, 1f / 60f)
        assertEquals(Form.WEREWULF, result.state.player.form)
        assertEquals(TransformPhase.STABLE, result.state.player.transformState.phase)
        assertTrue(result.events.contains(GameEvent.TransformationCompleted))
    }

    @Test
    fun transformSystem_beginsHumanReturn_atDawn() {
        val state = testGameState(
            player = testPlayerState(form = Form.WEREWULF, transformState = TransformState(TransformPhase.STABLE, 0)),
            time = testTimeState(phase = DayPhase.DAWN),
        )
        val result = system.update(state, idle, 1f / 60f)
        assertEquals(TransformPhase.TRANSFORMING_TO_HUMAN, result.state.player.transformState.phase)
    }

    @Test
    fun transformSystem_zerosVelocity_duringTransformation() {
        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                velocity = Vec3f(1f, 2f, 3f),
                transformState = TransformState(TransformPhase.TRANSFORMING_TO_WEREWULF, 0),
            ),
            time = testTimeState(phase = DayPhase.DUSK),
        )
        val result = system.update(state, idle, 1f / 60f)
        assertEquals(Vec3f.ZERO, result.state.player.velocity)
    }

    @Test
    fun transformSystem_noRetrigger_ifAlreadyTransforming() {
        // Already transforming — should not restart
        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                transformState = TransformState(TransformPhase.TRANSFORMING_TO_WEREWULF, 10),
            ),
            time = testTimeState(phase = DayPhase.DUSK),
        )
        val result = system.update(state, idle, 1f / 60f)
        // Progress should have advanced to 11, not reset to 0
        assertEquals(11, result.state.player.transformState.progressTicks)
        assertEquals(TransformPhase.TRANSFORMING_TO_WEREWULF, result.state.player.transformState.phase)
    }
}
