package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.geometry.Aabb
import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.MovementState
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.rules.CollisionResolver
import com.palacesoft.knightlore.domain.rules.RoomProvider
import com.palacesoft.knightlore.domain.rules.SolidVolume

class MovementSystem(
    private val roomProvider: RoomProvider,
    private val resolver: CollisionResolver = CollisionResolver(),
) : GameSystem {

    companion object {
        const val WALK_SPEED_HUMAN = 4.0f
        const val WALK_SPEED_WEREWULF = 5.0f
        const val JUMP_FORCE_HUMAN = 8.0f
        const val JUMP_FORCE_WEREWULF = 10.0f
        const val GRAVITY = -20.0f
        const val CARRY_SPEED_PENALTY = 0.8f
        const val JUMP_LOCK_TICKS = 5
        const val ENTITY_HALF_FOOTPRINT = 0.4f
        const val ENTITY_HEIGHT = 1.8f
    }

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val player = state.player
        val events = mutableListOf<GameEvent>()

        // 1. If transforming → zero velocity, skip all input, return
        if (player.transformState.phase != TransformPhase.STABLE) {
            val stopped = player.copy(
                velocity = Vec3f.ZERO,
                movementState = MovementState.TRANSFORMING,
            )
            return SystemResult(state.copy(player = stopped))
        }

        // 2. Decrement jumpLockTicks
        val jumpLock = (player.jumpLockTicks - 1).coerceAtLeast(0)

        // 3. Determine walk speed from form and inventory size
        val baseSpeed = if (player.form == Form.HUMAN) WALK_SPEED_HUMAN else WALK_SPEED_WEREWULF
        val speedMult = if (player.inventory.size >= 3) CARRY_SPEED_PENALTY else 1f
        val walkSpeed = baseSpeed * speedMult

        // 4. Horizontal velocity from input.moveVector (already in isometric world space)
        val horizontalVel = Vec3f(
            input.moveVector.x * walkSpeed,
            input.moveVector.y * walkSpeed,
            0f,
        )

        // 5. Vertical velocity: apply gravity, handle jump
        var vz = player.velocity.z + GRAVITY * tickDelta
        var jumpStarted = false
        if (input.jumpPressed && !player.airborne && jumpLock <= 0) {
            vz = if (player.form == Form.HUMAN) JUMP_FORCE_HUMAN else JUMP_FORCE_WEREWULF
            jumpStarted = true
            events += GameEvent.JumpStarted
        }

        val newVelocity = Vec3f(horizontalVel.x, horizontalVel.y, vz)

        // 6. Compute intended position
        val intendedPos = player.position + newVelocity * tickDelta

        // 7. Clamp to room floor (never go below z=0)
        val floorClamped = intendedPos.copy(z = intendedPos.z.coerceAtLeast(0f))

        // 8. Resolve against room solids
        val room = roomProvider.getRoom(state.currentRoomId)
        val solids = room?.tiles
            ?.filter { it.type == TileType.SOLID_BLOCK }
            ?.map { tile ->
                SolidVolume(
                    bounds = Aabb.of(
                        Vec3f(tile.gridX.toFloat(), tile.gridY.toFloat(), tile.gridZ.toFloat()),
                        Vec3f(tile.gridX + 1f, tile.gridY + 1f, tile.gridZ + 1f),
                    )
                )
            } ?: emptyList()

        val entityAabb = Aabb.of(
            Vec3f(-ENTITY_HALF_FOOTPRINT, -ENTITY_HALF_FOOTPRINT, 0f),
            Vec3f(ENTITY_HALF_FOOTPRINT, ENTITY_HALF_FOOTPRINT, ENTITY_HEIGHT),
        )

        val resolved = resolver.resolveMove(player.position, floorClamped, entityAabb, solids)

        // 9. Post-resolution: compute final velocity (zero axes that were blocked)
        val finalVz = if (resolved.landedOnSurface) 0f else
            if (resolved.resolvedPos.z == player.position.z && vz < 0) 0f else newVelocity.z
        val finalVx = if (resolved.hitWall) 0f else newVelocity.x
        val finalVy = if (resolved.hitWall) 0f else newVelocity.y
        val finalVelocity = Vec3f(finalVx, finalVy, finalVz)

        // 10. Update airborne flag
        val wasAirborne = player.airborne
        val nowAirborne = !resolved.landedOnSurface && resolved.resolvedPos.z > 0.01f
        val newJumpLock = if (wasAirborne && !nowAirborne) JUMP_LOCK_TICKS else jumpLock

        if (wasAirborne && !nowAirborne) events += GameEvent.Landed

        // 11. Update facing from last non-zero horizontal movement
        val newFacing = if (input.moveVector.x != 0f || input.moveVector.y != 0f) {
            directionFromVector(input.moveVector)
        } else {
            player.facing
        }

        // 12. Compute MovementState
        val newMovementState = when {
            nowAirborne && finalVz > 0 -> MovementState.JUMP_ASCENT
            nowAirborne && finalVz <= 0 -> MovementState.JUMP_DESCENT
            wasAirborne && !nowAirborne -> MovementState.LANDING
            input.moveVector.x != 0f || input.moveVector.y != 0f -> MovementState.WALKING
            else -> MovementState.IDLE
        }

        val newPlayer = player.copy(
            position = resolved.resolvedPos,
            velocity = finalVelocity,
            facing = newFacing,
            airborne = nowAirborne,
            jumpLockTicks = newJumpLock,
            movementState = newMovementState,
        )

        return SystemResult(state.copy(player = newPlayer), events)
    }

    private fun directionFromVector(v: Vec2f): Direction8 {
        val angle = kotlin.math.atan2(v.y.toDouble(), v.x.toDouble())
        val degrees = Math.toDegrees(angle).let { if (it < 0) it + 360 else it }
        return when {
            degrees < 22.5 || degrees >= 337.5 -> Direction8.EAST
            degrees < 67.5 -> Direction8.SOUTHEAST
            degrees < 112.5 -> Direction8.SOUTH
            degrees < 157.5 -> Direction8.SOUTHWEST
            degrees < 202.5 -> Direction8.WEST
            degrees < 247.5 -> Direction8.NORTHWEST
            degrees < 292.5 -> Direction8.NORTH
            else -> Direction8.NORTHEAST
        }
    }
}
