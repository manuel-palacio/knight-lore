package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomExit
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.RoomTransitionState
import com.palacesoft.knightlore.domain.model.TransitionPhase
import com.palacesoft.knightlore.domain.rules.RoomProvider
import com.palacesoft.knightlore.domain.testGameState
import com.palacesoft.knightlore.domain.testPlayerState
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

private val ROOM_A = RoomId("room-a")
private val ROOM_B = RoomId("room-b")

private fun roomWithNorthExit(): RoomDefinition = RoomDefinition(
    id = ROOM_A,
    width = 8,
    depth = 8,
    height = 5,
    tiles = emptyList(),
    actors = emptyList(),
    interactives = emptyList(),
    exits = listOf(
        RoomExit(side = ExitSide.NORTH, targetRoomId = ROOM_B, targetSpawnId = "spawn_s"),
    ),
    itemAnchors = emptyList(),
    theme = RoomTheme.CASTLE,
)

private fun roomProviderOf(vararg pairs: Pair<RoomId, RoomDefinition>): RoomProvider {
    val map = mapOf(*pairs)
    return object : RoomProvider {
        override fun getRoom(id: RoomId) = map[id]
    }
}

class RoomTransitionSystemTest {

    private val idle = FrameInput.IDLE

    @Test
    fun `RoomTransitionSystem_triggersTransition_whenPlayerCrossesNorthBoundary`() {
        val roomProvider = roomProviderOf(ROOM_A to roomWithNorthExit())
        val system = RoomTransitionSystem(roomProvider)

        // Player just past the north boundary (y < 0)
        val state = testGameState(
            player = testPlayerState(position = Vec3f(4f, -0.1f, 1f))
        ).copy(currentRoomId = ROOM_A)

        val result = system.update(state, idle, 1f / 60f)

        assertNotNull(result.state.roomTransition, "Expected roomTransition to be non-null")
        assertEquals(ROOM_B, result.state.roomTransition!!.toRoomId)
        assertTrue(
            result.events.any { it is GameEvent.EnteredRoom && it.roomId == ROOM_B },
            "Expected EnteredRoom event for ROOM_B"
        )
    }

    @Test
    fun `RoomTransitionSystem_completesTransition_afterCountdown`() {
        val roomProvider = roomProviderOf(ROOM_A to roomWithNorthExit())
        val system = RoomTransitionSystem(roomProvider)

        val activeTransition = RoomTransitionState(
            fromRoomId = ROOM_A,
            toRoomId = ROOM_B,
            targetSpawnId = "spawn_s",
            phase = TransitionPhase.SLIDING_IN,
            ticksRemaining = 1,
        )

        val state = testGameState(
            player = testPlayerState(position = Vec3f(4f, -0.1f, 1f))
        ).copy(
            currentRoomId = ROOM_A,
            roomTransition = activeTransition,
        )

        val result = system.update(state, idle, 1f / 60f)

        // Transition should be complete
        assertNull(result.state.roomTransition, "Expected roomTransition to be null after completion")
        assertEquals(ROOM_B, result.state.currentRoomId, "Expected current room to be ROOM_B")
    }

    @Test
    fun `RoomTransitionSystem_locksPlayer_duringTransition`() {
        val roomProvider = roomProviderOf(ROOM_A to roomWithNorthExit())
        val system = RoomTransitionSystem(roomProvider, transitionDurationTicks = 12)

        val originalPosition = Vec3f(4f, -0.1f, 1f)
        val activeTransition = RoomTransitionState(
            fromRoomId = ROOM_A,
            toRoomId = ROOM_B,
            targetSpawnId = "spawn_s",
            phase = TransitionPhase.SLIDING_OUT,
            ticksRemaining = 8,  // mid-transition
        )

        val state = testGameState(
            player = testPlayerState(position = originalPosition)
        ).copy(
            currentRoomId = ROOM_A,
            roomTransition = activeTransition,
        )

        val result = system.update(state, idle, 1f / 60f)

        // Player position should be unchanged during transition
        assertEquals(originalPosition, result.state.player.position,
            "Player position should not change during active transition")
        // Transition should still be active
        assertNotNull(result.state.roomTransition)
        assertEquals(7, result.state.roomTransition!!.ticksRemaining)
    }

    @Test
    fun `RoomTransitionSystem_spawnPositionIsCorrect_forSpawnS`() {
        val roomProvider = roomProviderOf(ROOM_A to roomWithNorthExit())
        val system = RoomTransitionSystem(roomProvider)

        // Start a transition with ticksRemaining=1 so it completes on next tick with spawn_s
        val activeTransition = RoomTransitionState(
            fromRoomId = ROOM_A,
            toRoomId = ROOM_B,
            targetSpawnId = "spawn_s",
            phase = TransitionPhase.SLIDING_IN,
            ticksRemaining = 1,
        )

        val state = testGameState(
            player = testPlayerState(position = Vec3f(4f, -0.1f, 1f))
        ).copy(
            currentRoomId = ROOM_A,
            roomTransition = activeTransition,
        )

        val result = system.update(state, idle, 1f / 60f)

        assertNull(result.state.roomTransition)
        assertEquals(
            Vec3f(4f, 6.5f, 0f),
            result.state.player.position,
            "Player should spawn at y=6.5 for spawn_s (1.5 tiles inside south wall)"
        )
    }
}
