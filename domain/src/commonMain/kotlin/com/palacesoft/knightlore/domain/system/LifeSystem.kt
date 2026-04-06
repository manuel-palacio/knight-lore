package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.MovementState
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.TransformState
import com.palacesoft.knightlore.domain.rules.RoomProvider

class LifeSystem(
    private val roomProvider: RoomProvider,
    private val damageCooldownTicks: Int = 180,    // 3 seconds invincibility after hit
    private val respawnPosition: Vec3f = Vec3f(2f, 2f, 0f),  // safe corner, away from hazards
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
                // Keep player in place with full cooldown so game-over screen has time to appear
                player.copy(lives = 0, damageCooldownTicks = damageCooldownTicks) to events
            } else {
                events += GameEvent.LifeLost
                // Respawn at safe corner, full 3-second grace period
                val safeRespawn = findSafeRespawn(respawnPosition, state.currentRoomId)
                val respawned = player.copy(
                    lives = newLives,
                    position = safeRespawn,
                    velocity = Vec3f.ZERO,
                    airborne = false,
                    damageCooldownTicks = damageCooldownTicks,
                    // Reset transform state so dying mid-transformation doesn't freeze movement
                    transformState = TransformState(TransformPhase.STABLE, 0),
                    movementState = MovementState.IDLE,
                )
                respawned to events
            }
        } else {
            player.copy(damageCooldownTicks = newCooldown) to events
        }

        return SystemResult(state.copy(player = newPlayer), newEvents)
    }

    private fun findSafeRespawn(pos: Vec3f, roomId: RoomId): Vec3f {
        val room = roomProvider.getRoom(roomId) ?: return pos
        var candidate = pos
        repeat(8) {
            val cx = candidate.x
            val cy = candidate.y
            val nearHazard = room.tiles.any { tile ->
                tile.type == TileType.HAZARD &&
                    kotlin.math.abs(tile.gridX.toFloat() + 0.5f - cx) < 2f &&
                    kotlin.math.abs(tile.gridY.toFloat() + 0.5f - cy) < 2f
            }
            if (!nearHazard) return candidate
            candidate = candidate.copy(x = candidate.x + 1f)
        }
        return candidate
    }

    private fun isPlayerOnHazard(pos: Vec3f, roomId: RoomId): Boolean {
        val room = roomProvider.getRoom(roomId) ?: return false
        val px = pos.x
        val py = pos.y
        // Only check XY footprint — hazard is a floor-level effect (z doesn't matter)
        return room.tiles.any { tile ->
            tile.type == TileType.HAZARD &&
                px >= tile.gridX.toFloat() && px < tile.gridX + 1f &&
                py >= tile.gridY.toFloat() && py < tile.gridY + 1f
        }
    }
}
