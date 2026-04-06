package com.palacesoft.knightlore.domain.rules

import com.palacesoft.knightlore.core.geometry.Aabb
import com.palacesoft.knightlore.core.math.Vec3f
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class CollisionResolverTest {

    private val resolver = CollisionResolver()

    // A standard player AABB: footprint 0.8x0.8, height 1.8 tiles
    private val playerAabb = Aabb.of(
        Vec3f(-0.4f, -0.4f, 0f),
        Vec3f(0.4f, 0.4f, 1.8f),
    )

    /** A 1x1x1 floor tile sitting at Z=0..1. */
    private fun floorSolid(x: Int, y: Int, z: Int = 0) = SolidVolume(
        bounds = Aabb.of(
            Vec3f(x.toFloat(), y.toFloat(), z.toFloat()),
            Vec3f(x + 1f, y + 1f, z + 1f),
        ),
        isTopStandable = true,
    )

    @Test
    fun `resolveMove_flatFloor_playerStaysOnSurface`() {
        // Player is standing on top of a block at z=0..1 (top at z=1).
        // Current pos is z=1 (on the surface). With downward velocity, intendedPos.z < 1.
        val solids = listOf(floorSolid(0, 0, 0))
        val currentPos = Vec3f(0.5f, 0.5f, 1f)
        val intendedPos = Vec3f(0.5f, 0.5f, 0.5f) // moving down

        val result = resolver.resolveMove(currentPos, intendedPos, playerAabb, solids)

        // Should land on top of the block at z=1
        assertEquals(1f, result.resolvedPos.z, 0.001f)
        assertTrue(result.landedOnSurface)
        assertEquals(1f, result.surfaceZ)
        assertFalse(result.hitWall)
    }

    @Test
    fun `resolveMove_playerLandsOnBlockTop`() {
        // Block with top at z=2. Player descends from z=3 toward z=1.5 (below block top).
        val solids = listOf(
            SolidVolume(
                bounds = Aabb.of(Vec3f(0f, 0f, 1f), Vec3f(1f, 1f, 2f)),
                isTopStandable = true,
            )
        )
        val currentPos = Vec3f(0.5f, 0.5f, 3f)
        val intendedPos = Vec3f(0.5f, 0.5f, 1.5f) // crossing through z=2 top

        val result = resolver.resolveMove(currentPos, intendedPos, playerAabb, solids)

        assertEquals(2f, result.resolvedPos.z, 0.001f)
        assertTrue(result.landedOnSurface)
        assertEquals(2f, result.surfaceZ)
    }

    @Test
    fun `resolveMove_playerBlockedBySideWall`() {
        // Wall solid occupying x=2..3 at same y and z as player.
        val solids = listOf(
            SolidVolume(
                bounds = Aabb.of(Vec3f(2f, 0f, 0f), Vec3f(3f, 1f, 2f)),
                isTopStandable = true,
            )
        )
        val currentPos = Vec3f(1f, 0.5f, 0f)
        val intendedPos = Vec3f(2f, 0.5f, 0f) // moving into wall on X axis

        val result = resolver.resolveMove(currentPos, intendedPos, playerAabb, solids)

        // X should be reverted to currentPos.x
        assertEquals(currentPos.x, result.resolvedPos.x, 0.001f)
        assertTrue(result.hitWall)
        assertFalse(result.landedOnSurface)
    }

    @Test
    fun `resolveMove_playerFallsThroughGap_noSolids`() {
        // No solids, player should fall freely to intendedPos
        val currentPos = Vec3f(5f, 5f, 10f)
        val intendedPos = Vec3f(5f, 5f, 5f)

        val result = resolver.resolveMove(currentPos, intendedPos, playerAabb, emptyList())

        assertEquals(intendedPos.x, result.resolvedPos.x, 0.001f)
        assertEquals(intendedPos.y, result.resolvedPos.y, 0.001f)
        assertEquals(intendedPos.z, result.resolvedPos.z, 0.001f)
        assertFalse(result.hitWall)
        assertFalse(result.landedOnSurface)
        assertNull(result.surfaceZ)
    }

    @Test
    fun `resolveMove_cornerCase_xAndYBothBlocked`() {
        // Wall on X axis and wall on Y axis; player tries to go diagonally into a corner
        val solids = listOf(
            SolidVolume(bounds = Aabb.of(Vec3f(2f, 0f, 0f), Vec3f(3f, 1f, 2f))), // X wall
            SolidVolume(bounds = Aabb.of(Vec3f(0f, 2f, 0f), Vec3f(1f, 3f, 2f))), // Y wall
        )
        val currentPos = Vec3f(1f, 1f, 0f)
        val intendedPos = Vec3f(2f, 2f, 0f) // diagonal

        val result = resolver.resolveMove(currentPos, intendedPos, playerAabb, solids)

        assertTrue(result.hitWall)
        // Both axes blocked — should revert to current position
        assertEquals(currentPos.x, result.resolvedPos.x, 0.001f)
        assertEquals(currentPos.y, result.resolvedPos.y, 0.001f)
    }

    @Test
    fun `resolveMove_stepOntoLedge_oneUnitAbove`() {
        // Ledge block at x=1..2, z=0..1 (top at z=1). Player at z=0, moving east into it.
        // Side of the block overlaps with player — X should be blocked (no auto step-up).
        val solids = listOf(
            SolidVolume(bounds = Aabb.of(Vec3f(1f, 0f, 0f), Vec3f(2f, 1f, 1f))),
        )
        val currentPos = Vec3f(0f, 0.5f, 0f)
        val intendedPos = Vec3f(1f, 0.5f, 0f) // moving east into ledge

        val result = resolver.resolveMove(currentPos, intendedPos, playerAabb, solids)

        // No auto step-up: player should be blocked on X
        assertTrue(result.hitWall)
        assertEquals(currentPos.x, result.resolvedPos.x, 0.001f)
    }

    @Test
    fun `findFloorBelow_returnsHighestSurface`() {
        // Two stacked blocks: z=0..1 and z=1..2. Highest top is at z=2.
        val solids = listOf(
            SolidVolume(bounds = Aabb.of(Vec3f(0f, 0f, 0f), Vec3f(1f, 1f, 1f))),
            SolidVolume(bounds = Aabb.of(Vec3f(0f, 0f, 1f), Vec3f(1f, 1f, 2f))),
        )
        val pos = Vec3f(0.5f, 0.5f, 3f)

        val floorZ = resolver.findFloorBelow(pos, playerAabb, solids)

        assertNotNull(floorZ)
        assertEquals(2f, floorZ!!, 0.001f)
    }

    @Test
    fun `findFloorBelow_noSolidsBelow_returnsNull`() {
        val pos = Vec3f(10f, 10f, 5f) // no solids anywhere near this position
        val solids = listOf(
            SolidVolume(bounds = Aabb.of(Vec3f(0f, 0f, 0f), Vec3f(1f, 1f, 1f))),
        )

        val floorZ = resolver.findFloorBelow(pos, playerAabb, solids)

        assertNull(floorZ)
    }
}
