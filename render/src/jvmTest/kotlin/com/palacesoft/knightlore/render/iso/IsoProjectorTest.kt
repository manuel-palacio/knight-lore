package com.palacesoft.knightlore.render.iso

import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class IsoProjectorTest {

    private fun assertVec2fEquals(expected: Vec2f, actual: Vec2f, delta: Float = 0.001f) {
        assertEquals(expected.x, actual.x, delta, "x")
        assertEquals(expected.y, actual.y, delta, "y")
    }

    @Test
    fun isoProjector_origin_mapsToZeroZero() {
        val result = IsoProjector.toScreen(0f, 0f, 0f)
        assertVec2fEquals(Vec2f(0f, 0f), result)
    }

    @Test
    fun isoProjector_xOne_movesDownRight() {
        // toScreen(1,0,0): x=(1-0)*32=32, y=(1+0)*16-0*32=16
        val result = IsoProjector.toScreen(1f, 0f, 0f)
        assertVec2fEquals(Vec2f(32f, 16f), result)
    }

    @Test
    fun isoProjector_yOne_movesDownLeft() {
        // toScreen(0,1,0): x=(0-1)*32=-32, y=(0+1)*16-0*32=16
        val result = IsoProjector.toScreen(0f, 1f, 0f)
        assertVec2fEquals(Vec2f(-32f, 16f), result)
    }

    @Test
    fun isoProjector_zOne_movesUp() {
        // toScreen(0,0,1): x=(0-0)*32=0, y=(0+0)*16-1*32=-32
        val result = IsoProjector.toScreen(0f, 0f, 1f)
        assertVec2fEquals(Vec2f(0f, -32f), result)
    }

    @Test
    fun isoProjector_depthKey_ordersFrontBeforeBack() {
        val front = IsoProjector.depthKey(Vec3f(1f, 1f, 0f))
        val back = IsoProjector.depthKey(Vec3f(0f, 0f, 0f))
        assertTrue(front > back, "front depth key should be greater than back")
    }
}
