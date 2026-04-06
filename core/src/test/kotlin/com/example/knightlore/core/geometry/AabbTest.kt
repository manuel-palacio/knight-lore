package com.example.knightlore.core.geometry

import com.example.knightlore.core.math.Vec3f
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class AabbTest {

    private fun box(x0: Float, y0: Float, z0: Float, x1: Float, y1: Float, z1: Float): Aabb =
        Aabb.of(Vec3f(x0, y0, z0), Vec3f(x1, y1, z1))

    @Test
    fun aabb_intersects_overlapping_returnsTrue() {
        val a = box(0f, 0f, 0f, 2f, 2f, 2f)
        val b = box(1f, 1f, 1f, 3f, 3f, 3f)
        assertTrue(a.intersects(b))
        assertTrue(b.intersects(a))
    }

    @Test
    fun aabb_intersects_adjacent_returnsFalse() {
        // Boxes that share a face — strict inequality means no collision
        val a = box(0f, 0f, 0f, 1f, 1f, 1f)
        val b = box(1f, 0f, 0f, 2f, 1f, 1f)
        assertFalse(a.intersects(b))
        assertFalse(b.intersects(a))
    }

    @Test
    fun aabb_intersects_separate_returnsFalse() {
        val a = box(0f, 0f, 0f, 1f, 1f, 1f)
        val b = box(5f, 5f, 5f, 6f, 6f, 6f)
        assertFalse(a.intersects(b))
    }

    @Test
    fun aabb_contains_insidePoint_returnsTrue() {
        val a = box(0f, 0f, 0f, 4f, 4f, 4f)
        assertTrue(a.contains(Vec3f(2f, 2f, 2f)))
    }

    @Test
    fun aabb_contains_outsidePoint_returnsFalse() {
        val a = box(0f, 0f, 0f, 4f, 4f, 4f)
        assertFalse(a.contains(Vec3f(5f, 2f, 2f)))
        assertFalse(a.contains(Vec3f(-1f, 2f, 2f)))
    }

    @Test
    fun aabb_expanded_increasesAllDimensions() {
        val a = box(1f, 1f, 1f, 3f, 3f, 3f)
        val expanded = a.expanded(1f)
        assertEquals(Vec3f(0f, 0f, 0f), expanded.min)
        assertEquals(Vec3f(4f, 4f, 4f), expanded.max)
    }

    @Test
    fun aabb_of_swappedCorners_normalizesCorrectly() {
        val a = Aabb.of(Vec3f(3f, 3f, 3f), Vec3f(1f, 1f, 1f))
        assertEquals(Vec3f(1f, 1f, 1f), a.min)
        assertEquals(Vec3f(3f, 3f, 3f), a.max)
    }
}
