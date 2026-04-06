package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.TileStack
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.domain.rules.RoomProvider
import com.palacesoft.knightlore.domain.testGameState
import com.palacesoft.knightlore.domain.testPlayerState
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

private val HAZARD_ROOM_ID = RoomId("hazard-room")
private val SAFE_ROOM_ID = RoomId("safe-room")

/** Room with a hazard tile at grid (4, 4, 0). Player standing at (4.5, 4.5, 0.5) overlaps it. */
private fun roomWithHazard(): RoomDefinition = RoomDefinition(
    id = HAZARD_ROOM_ID,
    width = 8,
    depth = 8,
    height = 5,
    tiles = listOf(TileStack(gridX = 4, gridY = 4, gridZ = 0, type = TileType.HAZARD)),
    actors = emptyList(),
    interactives = emptyList(),
    exits = emptyList(),
    itemAnchors = emptyList(),
    theme = RoomTheme.CASTLE,
)

private fun roomWithNoHazard(): RoomDefinition = RoomDefinition(
    id = SAFE_ROOM_ID,
    width = 8,
    depth = 8,
    height = 5,
    tiles = listOf(TileStack(gridX = 0, gridY = 0, gridZ = 0, type = TileType.FLOOR)),
    actors = emptyList(),
    interactives = emptyList(),
    exits = emptyList(),
    itemAnchors = emptyList(),
    theme = RoomTheme.CASTLE,
)

private fun roomProviderOf(vararg pairs: Pair<RoomId, RoomDefinition>): RoomProvider {
    val map = mapOf(*pairs)
    return object : RoomProvider {
        override fun getRoom(id: RoomId) = map[id]
    }
}

/** Position that overlaps the hazard tile at grid (4, 4, 0). */
private val HAZARD_POSITION = Vec3f(4.5f, 4.5f, 0.5f)

/** Position that does not overlap any hazard. */
private val SAFE_POSITION = Vec3f(1f, 1f, 1f)

private val RESPAWN = Vec3f(4f, 4f, 1f)

class LifeSystemTest {

    private val idle = FrameInput.IDLE

    @Test
    fun `LifeSystem_playerHitsHazard_losesLife`() {
        val roomProvider = roomProviderOf(HAZARD_ROOM_ID to roomWithHazard())
        val system = LifeSystem(roomProvider, respawnPosition = RESPAWN)

        val state = testGameState(
            player = testPlayerState(
                position = HAZARD_POSITION,
                lives = 3,
                damageCooldownTicks = 0,
            )
        ).copy(currentRoomId = HAZARD_ROOM_ID)

        val result = system.update(state, idle, 1f / 60f)

        assertEquals(2, result.state.player.lives, "Player should have lost one life")
        assertTrue(result.events.contains(GameEvent.PlayerDamaged))
        assertTrue(result.events.contains(GameEvent.LifeLost))
    }

    @Test
    fun `LifeSystem_playerHitsHazard_respawnsAtCenter`() {
        val roomProvider = roomProviderOf(HAZARD_ROOM_ID to roomWithHazard())
        val system = LifeSystem(roomProvider, respawnPosition = RESPAWN)

        val state = testGameState(
            player = testPlayerState(
                position = HAZARD_POSITION,
                lives = 3,
                damageCooldownTicks = 0,
            )
        ).copy(currentRoomId = HAZARD_ROOM_ID)

        val result = system.update(state, idle, 1f / 60f)

        assertEquals(RESPAWN, result.state.player.position, "Player should respawn at center")
        assertEquals(Vec3f.ZERO, result.state.player.velocity, "Player velocity should be zeroed on respawn")
        assertFalse(result.state.player.airborne, "Player should not be airborne on respawn")
    }

    @Test
    fun `LifeSystem_playerHitsHazard_noMoreLives_emitsGameOver`() {
        val roomProvider = roomProviderOf(HAZARD_ROOM_ID to roomWithHazard())
        val system = LifeSystem(roomProvider, respawnPosition = RESPAWN)

        val state = testGameState(
            player = testPlayerState(
                position = HAZARD_POSITION,
                lives = 1,
                damageCooldownTicks = 0,
            )
        ).copy(currentRoomId = HAZARD_ROOM_ID)

        val result = system.update(state, idle, 1f / 60f)

        assertEquals(0, result.state.player.lives)
        assertTrue(result.events.contains(GameEvent.PlayerDamaged))
        assertTrue(result.events.contains(GameEvent.LifeLost))
        assertTrue(result.events.contains(GameEvent.GameOver), "Expected GameOver event when lives reach 0")
    }

    @Test
    fun `LifeSystem_damageOnCooldown_noSecondHit`() {
        val roomProvider = roomProviderOf(HAZARD_ROOM_ID to roomWithHazard())
        val system = LifeSystem(roomProvider, respawnPosition = RESPAWN)

        // Player has active damage cooldown — should not take damage even on hazard
        val state = testGameState(
            player = testPlayerState(
                position = HAZARD_POSITION,
                lives = 3,
                damageCooldownTicks = 30,
            )
        ).copy(currentRoomId = HAZARD_ROOM_ID)

        val result = system.update(state, idle, 1f / 60f)

        assertEquals(3, result.state.player.lives, "Player should not lose a life while on cooldown")
        assertFalse(result.events.contains(GameEvent.PlayerDamaged))
        // Cooldown should be decremented
        assertEquals(29, result.state.player.damageCooldownTicks)
    }

    @Test
    fun `LifeSystem_noHazard_noDamage`() {
        val roomProvider = roomProviderOf(SAFE_ROOM_ID to roomWithNoHazard())
        val system = LifeSystem(roomProvider, respawnPosition = RESPAWN)

        val state = testGameState(
            player = testPlayerState(
                position = SAFE_POSITION,
                lives = 3,
                damageCooldownTicks = 0,
            )
        ).copy(currentRoomId = SAFE_ROOM_ID)

        val result = system.update(state, idle, 1f / 60f)

        assertEquals(3, result.state.player.lives, "Player should not lose life in room without hazard")
        assertFalse(result.events.contains(GameEvent.PlayerDamaged))
        assertFalse(result.events.contains(GameEvent.LifeLost))
    }
}
