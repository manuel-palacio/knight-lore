package com.palacesoft.knightlore.domain

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ActorKind
import com.palacesoft.knightlore.domain.model.ActorTypeDefinition
import com.palacesoft.knightlore.domain.model.CureMode
import com.palacesoft.knightlore.domain.model.CureSequenceDefinition
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.ItemType
import com.palacesoft.knightlore.domain.model.ProgressionDefinition
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomExit
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.TileStack
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.domain.rules.RoomProvider
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

class GameEngineIntegrationTest {

    private val testRoomId = RoomId("test-room")
    private val northRoomId = RoomId("north-room")

    private fun minimalRoom(
        id: RoomId,
        tiles: List<TileStack> = emptyList(),
        exits: List<RoomExit> = emptyList(),
    ) = RoomDefinition(
        id = id,
        width = 8,
        depth = 8,
        height = 6,
        tiles = tiles,
        actors = emptyList(),
        interactives = emptyList(),
        exits = exits,
        itemAnchors = emptyList(),
        theme = RoomTheme.CASTLE,
    )

    private fun roomProviderOf(vararg pairs: Pair<RoomId, RoomDefinition>): RoomProvider {
        val map = mapOf(*pairs)
        return object : RoomProvider {
            override fun getRoom(id: RoomId) = map[id]
        }
    }

    private fun minimalContent(rooms: Map<RoomId, RoomDefinition>): GameContent = GameContent(
        rooms = rooms,
        itemTypes = emptyMap(),
        actorTypes = mapOf(
            "guard" to ActorTypeDefinition("guard", ActorKind.GUARD_PATROL, 3f, 1, false),
        ),
        cureSequence = CureSequenceDefinition(CureMode.MODERN, emptyList(), false),
        progression = ProgressionDefinition(
            totalRequiredItems = 0,
            startRoomId = testRoomId,
            cauldronRoomId = RoomId("cauldron"),
        ),
    )

    @Test
    fun `gameEngine_fullTick_updatesTimeState`() {
        val room = minimalRoom(testRoomId)
        val roomProvider = roomProviderOf(testRoomId to room)
        val engine = DefaultGameEngine.create(roomProvider, minimalContent(mapOf(testRoomId to room)))
        val initial = testGameState()

        val result = engine.update(initial, FrameInput.IDLE, 1f / 60f)

        assertEquals(1L, result.state.time.tick)
    }

    @Test
    fun `gameEngine_playerOnHazard_losesLife`() {
        // Hazard tile at (4,4,0); player at (4.5, 4.5, 0.5) overlaps it
        val hazardTile = TileStack(gridX = 4, gridY = 4, gridZ = 0, type = TileType.HAZARD)
        val hazardRoom = minimalRoom(testRoomId, tiles = listOf(hazardTile))
        val roomProvider = roomProviderOf(testRoomId to hazardRoom)
        val engine = DefaultGameEngine.create(roomProvider, minimalContent(mapOf(testRoomId to hazardRoom)))

        val initial = testGameState(
            player = testPlayerState(
                position = Vec3f(4.5f, 4.5f, 0.5f),
                lives = 5,
                damageCooldownTicks = 0,
            )
        )

        val result = engine.update(initial, FrameInput.IDLE, 1f / 60f)

        assertEquals(4, result.state.player.lives)
    }

    @Test
    fun `gameEngine_playerCrossesNorthBoundary_beginsTransition`() {
        val northExit = RoomExit(
            side = ExitSide.NORTH,
            targetRoomId = northRoomId,
            targetSpawnId = "spawn_s",
        )
        val room = minimalRoom(testRoomId, exits = listOf(northExit))
        val northRoom = minimalRoom(northRoomId)
        val roomProvider = roomProviderOf(
            testRoomId to room,
            northRoomId to northRoom,
        )
        val rooms = mapOf(testRoomId to room, northRoomId to northRoom)
        val engine = DefaultGameEngine.create(roomProvider, minimalContent(rooms))

        val initial = testGameState(
            player = testPlayerState(position = Vec3f(4f, -0.1f, 1f))
        )

        val result = engine.update(initial, FrameInput.IDLE, 1f / 60f)

        assertNotNull(result.state.roomTransition)
    }
}
