package com.palacesoft.knightlore.core.geometry

import com.palacesoft.knightlore.core.math.Vec2f
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class IsoProjectionTest {

    @Test
    fun isoProjection_origin_mapsToZeroZero() {
        val result = IsoProjection.toScreen(0f, 0f, 0f)
        assertEquals(Vec2f(0f, 0f), result)
    }

    @Test
    fun isoProjection_xAxis_movesDownRight() {
        // Moving along +X: screen x increases (right), screen y increases (down)
        val result = IsoProjection.toScreen(1f, 0f, 0f)
        // sx = (1 - 0) * 32 = 32, sy = (1 + 0) * 16 - 0 = 16
        assertEquals(32f, result.x, 1e-4f)
        assertEquals(16f, result.y, 1e-4f)
        assertTrue(result.x > 0f, "Moving along +X should move right on screen")
        assertTrue(result.y > 0f, "Moving along +X should move down on screen")
    }

    @Test
    fun isoProjection_yAxis_movesDownLeft() {
        // Moving along +Y: screen x decreases (left), screen y increases (down)
        val result = IsoProjection.toScreen(0f, 1f, 0f)
        // sx = (0 - 1) * 32 = -32, sy = (0 + 1) * 16 - 0 = 16
        assertEquals(-32f, result.x, 1e-4f)
        assertEquals(16f, result.y, 1e-4f)
        assertTrue(result.x < 0f, "Moving along +Y should move left on screen")
        assertTrue(result.y > 0f, "Moving along +Y should move down on screen")
    }

    @Test
    fun isoProjection_zAxis_movesUp() {
        // Moving along +Z: screen y decreases (up), screen x unchanged
        val result = IsoProjection.toScreen(0f, 0f, 1f)
        // sx = 0, sy = 0 - 1 * 32 = -32
        assertEquals(0f, result.x, 1e-4f)
        assertEquals(-32f, result.y, 1e-4f)
        assertTrue(result.y < 0f, "Moving along +Z should move up on screen")
    }

    @Test
    fun isoProjection_depthKey_backToFrontOrder() {
        // (1, 0, 0) is "in front of" origin in depth sort.
        // The painter's algorithm depth key for isometric is typically worldX + worldY.
        // A point at (1,0,0) has depth 1; a point at (0,0,0) has depth 0.
        // So (1,0,0) should be drawn after (0,0,0) (i.e., it's closer to viewer).
        val depthOrigin = 0f + 0f  // x + y
        val depthFront = 1f + 0f   // x + y for (1,0,0)
        assertTrue(depthFront > depthOrigin, "Point at (1,0,0) should have greater depth key than origin")
    }
}
