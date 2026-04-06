package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.TileStack
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.TransformState
import com.palacesoft.knightlore.domain.rules.RoomProvider
import com.palacesoft.knightlore.domain.testGameState
import com.palacesoft.knightlore.domain.testPlayerState
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

private val TEST_ROOM_ID = RoomId("test-room")

/** A flat floor room: 10x10 tiles, floor layer at z=0 all solid blocks. */
private fun flatFloorRoom(): RoomDefinition {
    val tiles = (0 until 10).flatMap { x ->
        (0 until 10).map { y ->
            TileStack(x, y, 0, TileType.SOLID_BLOCK)
        }
    }
    return RoomDefinition(
        id = TEST_ROOM_ID,
        width = 10,
        depth = 10,
        height = 5,
        tiles = tiles,
        actors = emptyList(),
        interactives = emptyList(),
        exits = emptyList(),
        itemAnchors = emptyList(),
        theme = RoomTheme.CASTLE,
    )
}

/** Creates a test RoomProvider backed by a map. */
private fun roomProviderOf(vararg pairs: Pair<RoomId, RoomDefinition>): RoomProvider {
    val map = mapOf(*pairs)
    return RoomProvider { id -> map[id] }
}

// Functional interface helper so we can use lambda syntax
private fun RoomProvider(fn: (RoomId) -> RoomDefinition?): RoomProvider =
    object : RoomProvider {
        override fun getRoom(id: RoomId) = fn(id)
    }

class MovementSystemTest {

    private val tickDelta = 1f / 60f

    private fun idleInput() = FrameInput.IDLE

    private fun moveInput(x: Float, y: Float) = FrameInput(
        moveVector = Vec2f(x, y),
        jumpPressed = false,
        jumpHeld = false,
        actionPressed = false,
        dropPressed = false,
        cycleInventoryPressed = false,
        pausePressed = false,
    )

    private fun jumpInput() = FrameInput(
        moveVector = Vec2f.ZERO,
        jumpPressed = true,
        jumpHeld = true,
        actionPressed = false,
        dropPressed = false,
        cycleInventoryPressed = false,
        pausePressed = false,
    )

    @Test
    fun `MovementSystem_walksInIntendedDirection_onFlatFloor`() {
        val roomProvider = roomProviderOf(TEST_ROOM_ID to flatFloorRoom())
        val system = MovementSystem(roomProvider)

        // Player standing on top of floor (floor top is z=1), not airborne
        val startPos = Vec3f(5f, 5f, 1f)
        val state = testGameState(
            player = testPlayerState(
                position = startPos,
                velocity = Vec3f.ZERO,
                airborne = false,
            )
        )
        val input = moveInput(1f, 0f) // moving east

        val result = system.update(state, input, tickDelta)
        val newPos = result.state.player.position

        // Player should have moved east (positive X)
        assertTrue(newPos.x > startPos.x, "Expected eastward movement, got x=${newPos.x}")
    }

    @Test
    fun `MovementSystem_jumpLandsOnTargetBlock`() {
        val roomProvider = roomProviderOf(TEST_ROOM_ID to flatFloorRoom())
        val system = MovementSystem(roomProvider)

        // Player on floor at z=1, not airborne
        val startPos = Vec3f(5f, 5f, 1f)
        var state = testGameState(
            player = testPlayerState(
                position = startPos,
                velocity = Vec3f.ZERO,
                airborne = false,
            )
        )

        // Jump
        val jumpResult = system.update(state, jumpInput(), tickDelta)
        assertTrue(jumpResult.events.contains(GameEvent.JumpStarted), "Expected JumpStarted event")
        assertTrue(jumpResult.state.player.airborne, "Player should be airborne after jump")

        state = jumpResult.state

        // Simulate ticks until landed
        var landed = false
        repeat(120) {
            if (!landed) {
                val r = system.update(state, idleInput(), tickDelta)
                if (r.events.contains(GameEvent.Landed)) {
                    landed = true
                }
                state = r.state
            }
        }
        assertTrue(landed, "Player should have landed within 120 ticks")
    }

    @Test
    fun `MovementSystem_transformingPlayerIgnoresInput`() {
        val roomProvider = roomProviderOf(TEST_ROOM_ID to flatFloorRoom())
        val system = MovementSystem(roomProvider)

        val state = testGameState(
            player = testPlayerState(
                position = Vec3f(5f, 5f, 1f),
                velocity = Vec3f(2f, 2f, 0f),
                transformState = TransformState(TransformPhase.TRANSFORMING_TO_WEREWULF, 10),
            )
        )
        val input = moveInput(1f, 0f)

        val result = system.update(state, input, tickDelta)

        // Velocity should be zeroed, position should not change with horizontal movement
        assertEquals(Vec3f.ZERO, result.state.player.velocity)
    }

    @Test
    fun `MovementSystem_werewulfJumpsHigherThanHuman`() {
        val roomProvider = roomProviderOf(TEST_ROOM_ID to flatFloorRoom())

        val humanSystem = MovementSystem(roomProvider)
        val werewulfSystem = MovementSystem(roomProvider)

        val humanState = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                position = Vec3f(5f, 5f, 1f),
                velocity = Vec3f.ZERO,
                airborne = false,
            )
        )
        val werewulfState = testGameState(
            player = testPlayerState(
                form = Form.WEREWULF,
                position = Vec3f(5f, 5f, 1f),
                velocity = Vec3f.ZERO,
                airborne = false,
            )
        )

        val humanResult = humanSystem.update(humanState, jumpInput(), tickDelta)
        val werewulfResult = werewulfSystem.update(werewulfState, jumpInput(), tickDelta)

        val humanVz = humanResult.state.player.velocity.z
        val werewulfVz = werewulfResult.state.player.velocity.z

        assertTrue(werewulfVz > humanVz,
            "Werewulf vz=$werewulfVz should be > human vz=$humanVz")
    }

    @Test
    fun `MovementSystem_carryPenaltyReducesSpeed`() {
        val roomProvider = roomProviderOf(TEST_ROOM_ID to flatFloorRoom())
        val system = MovementSystem(roomProvider)

        val items = listOf(ItemId("item1"), ItemId("item2"), ItemId("item3"))

        val noCarryState = testGameState(
            player = testPlayerState(
                position = Vec3f(5f, 5f, 1f),
                velocity = Vec3f.ZERO,
                airborne = false,
                inventory = emptyList(),
            )
        )
        val carryState = testGameState(
            player = testPlayerState(
                position = Vec3f(5f, 5f, 1f),
                velocity = Vec3f.ZERO,
                airborne = false,
                inventory = items,
            )
        )

        val input = moveInput(1f, 0f)
        val noCarryResult = system.update(noCarryState, input, tickDelta)
        val carryResult = system.update(carryState, input, tickDelta)

        val noCarrySpeed = noCarryResult.state.player.velocity.x
        val carrySpeed = carryResult.state.player.velocity.x

        assertTrue(carrySpeed < noCarrySpeed,
            "Expected carry penalty: carrySpeed=$carrySpeed should be < noCarrySpeed=$noCarrySpeed")
    }
}
