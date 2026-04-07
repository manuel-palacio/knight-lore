package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.geometry.Aabb
import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.MovementState
import com.palacesoft.knightlore.domain.model.RoomDefinition
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
        const val ENTITY_HEIGHT = 0.9f  // reduced so head clears block tops (z=1)
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
        val tileSolids = room?.tiles
            ?.filter { it.type == TileType.SOLID_BLOCK }
            ?.map { tile ->
                SolidVolume(
                    bounds = Aabb.of(
                        Vec3f(tile.gridX.toFloat(), tile.gridY.toFloat(), tile.gridZ.toFloat()),
                        Vec3f(tile.gridX + 1f, tile.gridY + 1f, tile.gridZ + 1f),
                    )
                )
            } ?: emptyList()

        val wallSolids = room?.let { buildBoundaryWalls(it) } ?: emptyList()

        // Dynamic blocks — can be stood on and pushed
        val blockSolids = state.dynamicBlocks.map { block ->
            SolidVolume(
                bounds = Aabb.of(
                    Vec3f(block.gridX.toFloat(), block.gridY.toFloat(), block.gridZ.toFloat()),
                    Vec3f(block.gridX + 1f, block.gridY + 1f, block.gridZ + 1f),
                )
            )
        }

        // Implicit ground plane — entire room floor at z=0, always standable
        val groundPlane = room?.let {
            SolidVolume(
                bounds = Aabb.of(Vec3f(0f, 0f, -0.1f), Vec3f(it.width.toFloat(), it.depth.toFloat(), 0f)),
                isTopStandable = true,
            )
        }
        val solids = tileSolids + wallSolids + blockSolids + listOfNotNull(groundPlane)

        val entityAabb = Aabb.of(
            Vec3f(-ENTITY_HALF_FOOTPRINT, -ENTITY_HALF_FOOTPRINT, 0f),
            Vec3f(ENTITY_HALF_FOOTPRINT, ENTITY_HALF_FOOTPRINT, ENTITY_HEIGHT),
        )

        val resolved = resolver.resolveMove(player.position, floorClamped, entityAabb, solids)

        // 9. Post-resolution: compute final velocity (zero axes that were blocked)
        val finalVz = if (resolved.landedOnSurface) 0f else
            if (resolved.resolvedPos.z == player.position.z && vz < 0) 0f else newVelocity.z
        val finalVx = if (resolved.hitWallX) 0f else newVelocity.x
        val finalVy = if (resolved.hitWallY) 0f else newVelocity.y
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

    /**
     * Builds invisible boundary SolidVolumes for room perimeter walls.
     * Exit tiles get a gap so the player can pass through to trigger room transitions.
     *
     * Wall height matches the visual wall height (2 tiles). The gap spans the same
     * two-tile width used by [RoomEntityFactory.buildWalls]: floor(width/2)-1 and floor(width/2).
     */
    private fun buildBoundaryWalls(room: RoomDefinition): List<SolidVolume> {
        val w = room.width.toFloat()
        val d = room.depth.toFloat()
        val wallH = 2f
        val thickness = 0.5f  // invisible collision slab thickness

        // Identify which sides have exits and the gap tile positions
        val northGapRange = if (room.exits.any { it.side == ExitSide.NORTH }) {
            (room.width / 2 - 1).toFloat()..(room.width / 2).toFloat()
        } else null
        val southGapRange = if (room.exits.any { it.side == ExitSide.SOUTH }) {
            (room.width / 2 - 1).toFloat()..(room.width / 2).toFloat()
        } else null
        val westGapRange = if (room.exits.any { it.side == ExitSide.WEST }) {
            (room.depth / 2 - 1).toFloat()..(room.depth / 2).toFloat()
        } else null
        val eastGapRange = if (room.exits.any { it.side == ExitSide.EAST }) {
            (room.depth / 2 - 1).toFloat()..(room.depth / 2).toFloat()
        } else null

        val walls = mutableListOf<SolidVolume>()

        // Visual wall tiles are 1 unit deep inside the room:
        //   North wall tiles: y ∈ [0, 1]    → slab covers y ∈ [-thickness, 1]
        //   South wall tiles: y ∈ [d-1, d]  → slab covers y ∈ [d-1, d+thickness]
        //   West wall tiles:  x ∈ [0, 1]    → slab covers x ∈ [-thickness, 1]
        //   East wall tiles:  x ∈ [w-1, w]  → slab covers x ∈ [w-1, w+thickness]
        // Exit gap tiles have NO slab so the player can walk through to trigger transition.

        // North wall
        if (northGapRange == null) {
            walls += wallSlab(0f, -thickness, w, 1f, wallH)
        } else {
            val gapStart = northGapRange.start
            val gapEnd = northGapRange.endInclusive + 1f
            if (gapStart > 0f) walls += wallSlab(0f, -thickness, gapStart, 1f, wallH)
            if (gapEnd < w)   walls += wallSlab(gapEnd, -thickness, w, 1f, wallH)
        }

        // South wall
        if (southGapRange == null) {
            walls += wallSlab(0f, d - 1f, w, d + thickness, wallH)
        } else {
            val gapStart = southGapRange.start
            val gapEnd = southGapRange.endInclusive + 1f
            if (gapStart > 0f) walls += wallSlab(0f, d - 1f, gapStart, d + thickness, wallH)
            if (gapEnd < w)   walls += wallSlab(gapEnd, d - 1f, w, d + thickness, wallH)
        }

        // West wall
        if (westGapRange == null) {
            walls += wallSlab(-thickness, 0f, 1f, d, wallH)
        } else {
            val gapStart = westGapRange.start
            val gapEnd = westGapRange.endInclusive + 1f
            if (gapStart > 0f) walls += wallSlab(-thickness, 0f, 1f, gapStart, wallH)
            if (gapEnd < d)   walls += wallSlab(-thickness, gapEnd, 1f, d, wallH)
        }

        // East wall
        if (eastGapRange == null) {
            walls += wallSlab(w - 1f, 0f, w + thickness, d, wallH)
        } else {
            val gapStart = eastGapRange.start
            val gapEnd = eastGapRange.endInclusive + 1f
            if (gapStart > 0f) walls += wallSlab(w - 1f, 0f, w + thickness, gapStart, wallH)
            if (gapEnd < d)   walls += wallSlab(w - 1f, gapEnd, w + thickness, d, wallH)
        }

        return walls
    }

    private fun wallSlab(xMin: Float, yMin: Float, xMax: Float, yMax: Float, height: Float): SolidVolume =
        SolidVolume(
            bounds = Aabb.of(Vec3f(xMin, yMin, 0f), Vec3f(xMax, yMax, height)),
            isTopStandable = false,
        )

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
