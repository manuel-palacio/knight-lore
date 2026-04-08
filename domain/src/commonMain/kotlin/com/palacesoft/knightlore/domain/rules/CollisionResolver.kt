package com.palacesoft.knightlore.domain.rules

import com.palacesoft.knightlore.core.geometry.Aabb
import com.palacesoft.knightlore.core.math.Vec3f

data class SolidVolume(
    val bounds: Aabb,
    val isTopStandable: Boolean = true,
)

data class ResolvedMove(
    val resolvedPos: Vec3f,
    val hitWallX: Boolean,
    val hitWallY: Boolean,
    val landedOnSurface: Boolean,
    val surfaceZ: Float?,
) {
    /** True if either horizontal axis was blocked. */
    val hitWall: Boolean get() = hitWallX || hitWallY
}

class CollisionResolver {

    /**
     * Translates the entity AABB (centered at origin) to world space using foot position.
     */
    private fun entityWorldBounds(pos: Vec3f, entityAabb: Aabb): Aabb =
        entityAabb.translated(pos)

    /**
     * Sweeps the entity AABB from currentPos to intendedPos against a list of solid volumes.
     * Resolves horizontal (X, Y) axes first, then vertical (Z) independently.
     *
     * @param currentPos current entity foot position (center-bottom of entity AABB)
     * @param intendedPos desired foot position after movement this tick
     * @param entityAabb AABB centered at origin; translate to worldPos to get world bounds
     * @param solids list of solid volumes in the current room
     * @return ResolvedMove with the safe resolved position and collision flags
     */
    fun resolveMove(
        currentPos: Vec3f,
        intendedPos: Vec3f,
        entityAabb: Aabb,
        solids: List<SolidVolume>,
    ): ResolvedMove {
        var resolvedPos = currentPos
        var hitWallX = false
        var hitWallY = false
        var landedOnSurface = false
        var surfaceZ: Float? = null

        // Step 1: Resolve X axis
        val xTestPos = Vec3f(intendedPos.x, currentPos.y, currentPos.z)
        val xBounds = entityWorldBounds(xTestPos, entityAabb)
        val xBlocked = solids.any { it.bounds.intersects(xBounds) }
        val resolvedX = if (xBlocked) {
            hitWallX = true
            currentPos.x
        } else {
            intendedPos.x
        }
        resolvedPos = resolvedPos.copy(x = resolvedX)

        // Step 2: Resolve Y axis
        val yTestPos = Vec3f(resolvedPos.x, intendedPos.y, currentPos.z)
        val yBounds = entityWorldBounds(yTestPos, entityAabb)
        val yBlocked = solids.any { it.bounds.intersects(yBounds) }
        val resolvedY = if (yBlocked) {
            hitWallY = true
            currentPos.y
        } else {
            intendedPos.y
        }
        resolvedPos = resolvedPos.copy(y = resolvedY)

        // Step 3: Resolve Z axis
        val resolvedZ: Float
        if (intendedPos.z < currentPos.z) {
            // Moving downward — check for landing on a standable surface
            val descendingLandingSurface = solids
                .filter { solid ->
                    if (!solid.isTopStandable) return@filter false
                    val surfaceTop = solid.bounds.max.z
                    // Surface top must be between intendedPos.z and currentPos.z
                    surfaceTop in intendedPos.z..currentPos.z
                }
                .filter { solid ->
                    // Check XY footprint overlap
                    val zTestPos = Vec3f(resolvedPos.x, resolvedPos.y, intendedPos.z)
                    val zBounds = entityWorldBounds(zTestPos, entityAabb)
                    // Check XY overlap only (ignore Z for footprint check)
                    val xyOverlap = zBounds.min.x < solid.bounds.max.x &&
                            zBounds.max.x > solid.bounds.min.x &&
                            zBounds.min.y < solid.bounds.max.y &&
                            zBounds.max.y > solid.bounds.min.y
                    xyOverlap
                }
                .maxByOrNull { it.bounds.max.z }

            if (descendingLandingSurface != null) {
                resolvedZ = descendingLandingSurface.bounds.max.z
                landedOnSurface = true
                surfaceZ = descendingLandingSurface.bounds.max.z
            } else {
                resolvedZ = intendedPos.z
            }
        } else if (intendedPos.z > currentPos.z) {
            // Moving upward — check for ceiling collision
            val zTestPos = Vec3f(resolvedPos.x, resolvedPos.y, intendedPos.z)
            val zBounds = entityWorldBounds(zTestPos, entityAabb)
            val ceilingBlocked = solids.any { it.bounds.intersects(zBounds) }
            resolvedZ = if (ceilingBlocked) currentPos.z else intendedPos.z
        } else {
            resolvedZ = intendedPos.z
        }
        resolvedPos = resolvedPos.copy(z = resolvedZ)

        return ResolvedMove(
            resolvedPos = resolvedPos,
            hitWallX = hitWallX,
            hitWallY = hitWallY,
            landedOnSurface = landedOnSurface,
            surfaceZ = surfaceZ,
        )
    }

    /**
     * Finds the highest standable surface Z directly below the given position.
     * Returns null if no surface is below.
     */
    fun findFloorBelow(pos: Vec3f, entityAabb: Aabb, solids: List<SolidVolume>): Float? {
        val worldBounds = entityWorldBounds(pos, entityAabb)
        return solids
            .filter { solid ->
                if (!solid.isTopStandable) return@filter false
                val surfaceTop = solid.bounds.max.z
                // Surface must be at or slightly below current position (with tolerance)
                surfaceTop <= pos.z + 0.1f
            }
            .filter { solid ->
                // XY footprint overlap check
                val xyOverlap = worldBounds.min.x < solid.bounds.max.x &&
                        worldBounds.max.x > solid.bounds.min.x &&
                        worldBounds.min.y < solid.bounds.max.y &&
                        worldBounds.max.y > solid.bounds.min.y
                xyOverlap
            }
            .maxByOrNull { it.bounds.max.z }
            ?.bounds?.max?.z
    }
}
