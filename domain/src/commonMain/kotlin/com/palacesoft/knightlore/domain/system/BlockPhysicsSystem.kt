package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.BlockState
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.rules.RoomProvider

private const val FALL_COUNTDOWN_TICKS = 120   // ticks player must stand before block falls
private const val FALL_GRAVITY = 0.15f          // velocity added per tick once falling
private const val PUSH_THRESHOLD = 0.3f         // min input magnitude to trigger push

class BlockPhysicsSystem(private val roomProvider: RoomProvider) : GameSystem {

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val player = state.player
        val room = roomProvider.getRoom(state.currentRoomId) ?: return SystemResult(state)
        val maxX = room.width - 2
        val maxY = room.depth - 2

        // ── 1. Push detection ─────────────────────────────────────────────────────
        // Determine push direction from input (only one axis at a time)
        val pushDx = when {
            input.moveVector.x >  PUSH_THRESHOLD -> 1
            input.moveVector.x < -PUSH_THRESHOLD -> -1
            else -> 0
        }
        val pushDy = when {
            input.moveVector.y >  PUSH_THRESHOLD -> 1
            input.moveVector.y < -PUSH_THRESHOLD -> -1
            else -> 0
        }

        val afterPush = if (!player.airborne && (pushDx != 0 || pushDy != 0)) {
            val px = player.position.x
            val py = player.position.y
            val pz = player.position.z
            val playerGridX = px.toInt()
            val playerGridY = py.toInt()
            val playerGridZ = pz.toInt()

            state.dynamicBlocks.map { block ->
                if (!block.pushable || block.velocityZ != 0f) return@map block

                val adjacentX = pushDx != 0 && block.gridX == playerGridX + pushDx && block.gridY == playerGridY
                val adjacentY = pushDy != 0 && block.gridY == playerGridY + pushDy && block.gridX == playerGridX
                val sameLevel = block.gridZ == playerGridZ

                if (!(adjacentX || adjacentY) || !sameLevel) return@map block

                val targetX = block.gridX + pushDx
                val targetY = block.gridY + pushDy

                // Check room bounds
                if (targetX < 1 || targetX >= maxX || targetY < 1 || targetY >= maxY) return@map block

                // Check no tile occupies target
                val targetBlocked = room.tiles.any { tile ->
                    tile.gridX == targetX && tile.gridY == targetY && tile.gridZ == block.gridZ &&
                        tile.type == com.palacesoft.knightlore.domain.model.TileType.SOLID_BLOCK
                }
                if (targetBlocked) return@map block

                // Check no other dynamic block at target
                val otherBlockAt = state.dynamicBlocks.any { other ->
                    other !== block && other.gridX == targetX && other.gridY == targetY && other.gridZ == block.gridZ
                }
                if (otherBlockAt) return@map block

                block.copy(
                    gridX = targetX,
                    gridY = targetY,
                    slideFrom = com.palacesoft.knightlore.core.math.Vec3f(
                        block.gridX.toFloat(), block.gridY.toFloat(), block.gridZ.toFloat()
                    ),
                    slideTick = state.time.tick.toInt(),
                )
            }
        } else {
            state.dynamicBlocks
        }

        // ── 2. Fall detection + physics ───────────────────────────────────────────
        val px = player.position.x
        val py = player.position.y
        val pz = player.position.z

        val currentTick = state.time.tick.toInt()
        val updatedBlocks = afterPush.map { block0 ->
            // Clear completed slide animations
            val block = if (block0.slideFrom != null &&
                (currentTick - block0.slideTick) >= BlockState.SLIDE_DURATION_TICKS
            ) {
                block0.copy(slideFrom = null, slideTick = 0)
            } else block0

            val gx = block.gridX.toFloat()
            val gy = block.gridY.toFloat()
            val gz = block.gridZ.toFloat()

            val playerStandsOn = !player.airborne &&
                px >= gx && px < gx + 1f &&
                py >= gy && py < gy + 1f &&
                pz >= gz + 0.85f && pz <= gz + 1.15f

            when {
                // Active fall — apply gravity and descend
                block.velocityZ < 0f || block.fallingTicks >= FALL_COUNTDOWN_TICKS -> {
                    val newVz = (block.velocityZ - FALL_GRAVITY * tickDelta).coerceAtMost(-0.05f)
                    val newZf = gz + newVz
                    val newZ = maxOf(0, newZf.toInt())
                    if (newZ <= 0) {
                        // Landed
                        block.copy(gridZ = 0, fallingTicks = 0, velocityZ = 0f)
                    } else {
                        block.copy(gridZ = newZ, velocityZ = newVz)
                    }
                }

                // Player standing on it — tick up countdown
                playerStandsOn ->
                    block.copy(fallingTicks = block.fallingTicks + 1)

                // Reset countdown if player stepped off before threshold
                block.fallingTicks > 0 ->
                    block.copy(fallingTicks = 0)

                else -> block
            }
        }

        return SystemResult(state.copy(dynamicBlocks = updatedBlocks))
    }
}
