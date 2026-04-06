package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.ActorId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ActorBehavior
import com.palacesoft.knightlore.domain.model.ActorKind
import com.palacesoft.knightlore.domain.model.ActorSpawn
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.ActorType
import com.palacesoft.knightlore.domain.model.ActorTypeDefinition
import com.palacesoft.knightlore.domain.model.CureMode
import com.palacesoft.knightlore.domain.model.CureSequenceDefinition
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.ProgressionDefinition
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.rules.RoomProvider
import com.palacesoft.knightlore.domain.testGameState
import com.palacesoft.knightlore.domain.testPlayerState
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class HazardSystemTest {

    private val roomId = RoomId("test-room")

    private fun makeContent(
        patrolRadius: Float = 3f,
    ): GameContent = GameContent(
        rooms = emptyMap(),
        itemTypes = emptyMap(),
        actorTypes = mapOf(
            "guard" to ActorTypeDefinition("guard", ActorKind.GUARD_PATROL, patrolRadius, 1, false),
            "ghost" to ActorTypeDefinition("ghost", ActorKind.GHOST, 0f, 1, false),
            "druid" to ActorTypeDefinition("druid", ActorKind.FORM_REACTIVE, 0f, 1, true),
        ),
        cureSequence = CureSequenceDefinition(CureMode.MODERN, emptyList(), false),
        progression = ProgressionDefinition(
            totalRequiredItems = 0,
            startRoomId = roomId,
            cauldronRoomId = RoomId("cauldron"),
        ),
    )

    private fun makeRoomProvider(spawnX: Float = 5f): RoomProvider {
        val room = RoomDefinition(
            id = roomId,
            width = 12,
            depth = 12,
            height = 6,
            tiles = emptyList(),
            actors = listOf(ActorSpawn(ActorType.GUARD, Vec3f(spawnX, 5f, 1f))),
            interactives = emptyList(),
            exits = emptyList(),
            itemAnchors = emptyList(),
            theme = RoomTheme.CASTLE,
        )
        return object : RoomProvider {
            override fun getRoom(id: RoomId) = if (id == roomId) room else null
        }
    }

    private fun makePatrolActor(posX: Float, state: String = "PATROL_RIGHT") = ActorState(
        id = ActorId("guard_01"),
        type = ActorType.GUARD,
        position = Vec3f(posX, 5f, 1f),
        velocity = Vec3f.ZERO,
        behaviorState = state,
        behavior = ActorBehavior.PATROL,
        form = null,
    )

    @Test
    fun patrol_movesRightWhenStatePATROL_RIGHT() {
        val system = HazardSystem(makeRoomProvider(spawnX = 5f), makeContent(patrolRadius = 3f))
        val actor = makePatrolActor(posX = 5f, state = "PATROL_RIGHT")

        val state = testGameState().copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)
        val updatedActor = result.state.actorStates.first()

        // Should have moved right (positive X)
        assertTrue(updatedActor.position.x > 5f)
    }

    @Test
    fun patrol_movesLeftWhenStatePATROL_LEFT() {
        val system = HazardSystem(makeRoomProvider(spawnX = 5f), makeContent(patrolRadius = 3f))
        val actor = makePatrolActor(posX = 5f, state = "PATROL_LEFT")

        val state = testGameState().copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)
        val updatedActor = result.state.actorStates.first()

        // Should have moved left (negative X)
        assertTrue(updatedActor.position.x < 5f)
    }

    @Test
    fun patrol_reverseDirection_whenExceedsRightBound() {
        val spawnX = 5f
        val patrolRadius = 3f
        // Place actor just at the right boundary
        val system = HazardSystem(makeRoomProvider(spawnX), makeContent(patrolRadius))
        val actor = makePatrolActor(posX = spawnX + patrolRadius - 0.01f, state = "PATROL_RIGHT")

        val state = testGameState().copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)
        val updatedActor = result.state.actorStates.first()

        assertEquals("PATROL_LEFT", updatedActor.behaviorState)
    }

    @Test
    fun patrol_reverseDirection_whenExceedsLeftBound() {
        val spawnX = 5f
        val patrolRadius = 3f
        // Place actor just at the left boundary
        val system = HazardSystem(makeRoomProvider(spawnX), makeContent(patrolRadius))
        val actor = makePatrolActor(posX = spawnX - patrolRadius + 0.01f, state = "PATROL_LEFT")

        val state = testGameState().copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)
        val updatedActor = result.state.actorStates.first()

        assertEquals("PATROL_RIGHT", updatedActor.behaviorState)
    }

    @Test
    fun contactDamage_whenPlayerCloseToActor_dealsHit() {
        val system = HazardSystem(makeRoomProvider(), makeContent())
        val actor = makePatrolActor(posX = 5f).copy(
            position = Vec3f(5f, 5f, 1f),
        )

        val state = testGameState(
            player = testPlayerState(
                position = Vec3f(5.3f, 5f, 1f),  // within 0.8f
                lives = 3,
                damageCooldownTicks = 0,
            ),
        ).copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)

        assertEquals(2, result.state.player.lives)
        assertTrue(result.events.any { it == GameEvent.PlayerDamaged })
        assertTrue(result.state.player.damageCooldownTicks > 0)
    }

    @Test
    fun contactDamage_cooldownPreventsDoubleHit() {
        val system = HazardSystem(makeRoomProvider(), makeContent())
        val actor = makePatrolActor(posX = 5f).copy(
            position = Vec3f(5f, 5f, 1f),
        )

        // Player has active cooldown
        val state = testGameState(
            player = testPlayerState(
                position = Vec3f(5.3f, 5f, 1f),
                lives = 3,
                damageCooldownTicks = 30,  // still in cooldown
            ),
        ).copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)

        // No damage should be dealt
        assertEquals(3, result.state.player.lives)
        assertTrue(result.events.none { it == GameEvent.PlayerDamaged })
    }

    @Test
    fun contactDamage_zeroLives_emitsGameOver() {
        val system = HazardSystem(makeRoomProvider(), makeContent())
        val actor = makePatrolActor(posX = 5f).copy(
            position = Vec3f(5f, 5f, 1f),
        )

        val state = testGameState(
            player = testPlayerState(
                position = Vec3f(5.3f, 5f, 1f),
                lives = 1,
                damageCooldownTicks = 0,
            ),
        ).copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)

        assertEquals(0, result.state.player.lives)
        assertTrue(result.events.any { it == GameEvent.GameOver })
    }

    @Test
    fun reactiveActor_werewulfPlayer_movesTowardPlayer() {
        val system = HazardSystem(makeRoomProvider(), makeContent())
        val actor = ActorState(
            id = ActorId("druid_01"),
            type = ActorType.DRUID,
            position = Vec3f(10f, 5f, 1f),
            velocity = Vec3f.ZERO,
            behaviorState = "IDLE",
            behavior = ActorBehavior.REACTIVE,
            form = null,
        )

        val state = testGameState(
            player = testPlayerState(
                form = Form.WEREWULF,
                position = Vec3f(5f, 5f, 1f),
            ),
        ).copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)
        val updatedActor = result.state.actorStates.first()

        // Actor should have moved toward player (left = smaller X)
        assertTrue(updatedActor.position.x < 10f)
    }

    @Test
    fun reactiveActor_humanPlayer_staysStill() {
        val system = HazardSystem(makeRoomProvider(), makeContent())
        val actor = ActorState(
            id = ActorId("druid_01"),
            type = ActorType.DRUID,
            position = Vec3f(10f, 5f, 1f),
            velocity = Vec3f.ZERO,
            behaviorState = "IDLE",
            behavior = ActorBehavior.REACTIVE,
            form = null,
        )

        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                position = Vec3f(5f, 5f, 1f),
            ),
        ).copy(
            currentRoomId = roomId,
            actorStates = listOf(actor),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)
        val updatedActor = result.state.actorStates.first()

        assertEquals(Vec3f.ZERO, updatedActor.velocity)
    }
}
