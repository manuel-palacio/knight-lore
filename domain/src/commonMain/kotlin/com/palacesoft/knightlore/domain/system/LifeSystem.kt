package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.domain.rules.RoomProvider

class LifeSystem(
    private val roomProvider: RoomProvider,
    private val damageCooldownTicks: Int = 60,  // ~1 second invincibility after hit
    private val respawnPosition: Vec3f = Vec3f(4f, 4f, 1f),
) : GameSystem {

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val player = state.player
        val events = mutableListOf<GameEvent>()

        // 1. Decrement damage cooldown
        val newCooldown = (player.damageCooldownTicks - 1).coerceAtLeast(0)

        // 2. Check hazard contact (only if cooldown == 0)
        val hitHazard = newCooldown == 0 && isPlayerOnHazard(player.position, state.currentRoomId)

        val (newPlayer, newEvents) = if (hitHazard) {
            events += GameEvent.PlayerDamaged
            val newLives = player.lives - 1
            if (newLives <= 0) {
                events += GameEvent.LifeLost
                events += GameEvent.GameOver
                player.copy(lives = 0, damageCooldownTicks = 0) to events
            } else {
                events += GameEvent.LifeLost
                // Respawn player at room center, reset velocity and airborne
                val respawned = player.copy(
                    lives = newLives,
                    position = respawnPosition,
                    velocity = Vec3f.ZERO,
                    airborne = false,
                    damageCooldownTicks = damageCooldownTicks,
                )
                respawned to events
            }
        } else {
            player.copy(damageCooldownTicks = newCooldown) to events
        }

        return SystemResult(state.copy(player = newPlayer), newEvents)
    }

    private fun isPlayerOnHazard(pos: Vec3f, roomId: RoomId): Boolean {
        val room = roomProvider.getRoom(roomId) ?: return false
        // Check if player's foot position overlaps any HAZARD tile
        val px = pos.x
        val py = pos.y
        val pz = pos.z
        return room.tiles.any { tile ->
            tile.type == TileType.HAZARD &&
                px >= tile.gridX.toFloat() && px < tile.gridX + 1f &&
                py >= tile.gridY.toFloat() && py < tile.gridY + 1f &&
                pz >= tile.gridZ.toFloat() && pz < tile.gridZ + 1f
        }
    }
}
