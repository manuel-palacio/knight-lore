package com.example.knightlore.core.math

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import kotlin.math.abs
import kotlin.math.sqrt

class Vec3fTest {

    @Test
    fun vec3f_addition_producesCorrectResult() {
        val a = Vec3f(1f, 2f, 3f)
        val b = Vec3f(4f, 5f, 6f)
        val result = a + b
        assertEquals(Vec3f(5f, 7f, 9f), result)
    }

    @Test
    fun vec3f_normalized_returnsUnitVector() {
        val v = Vec3f(3f, 4f, 0f)
        val n = v.normalized()
        val len = n.length()
        assertEquals(1f, len, 1e-5f)
        assertEquals(0.6f, n.x, 1e-5f)
        assertEquals(0.8f, n.y, 1e-5f)
    }

    @Test
    fun vec3f_normalized_zeroVector_returnsZero() {
        val result = Vec3f.ZERO.normalized()
        assertEquals(Vec3f.ZERO, result)
    }

    @Test
    fun vec3f_cross_producesOrthogonalVector() {
        val x = Vec3f(1f, 0f, 0f)
        val y = Vec3f(0f, 1f, 0f)
        val cross = x.cross(y)
        // x cross y = z axis
        assertEquals(Vec3f(0f, 0f, 1f), cross)
        // Should be orthogonal to both inputs
        assertEquals(0f, cross.dot(x), 1e-6f)
        assertEquals(0f, cross.dot(y), 1e-6f)
    }

    @Test
    fun vec3f_withZ_changesOnlyZComponent() {
        val v = Vec3f(1f, 2f, 3f)
        val result = v.withZ(99f)
        assertEquals(1f, result.x)
        assertEquals(2f, result.y)
        assertEquals(99f, result.z)
    }
}
