package com.example.knightlore.core.geometry

import com.example.knightlore.core.math.Vec3f

/**
 * Axis-aligned bounding box in 3D world space.
 *
 * Coordinate convention: X = east, Y = south, Z = up.
 */
data class Aabb(val min: Vec3f, val max: Vec3f) {

    fun width(): Float = max.x - min.x

    fun depth(): Float = max.y - min.y

    fun height(): Float = max.z - min.z

    fun center(): Vec3f = Vec3f(
        (min.x + max.x) * 0.5f,
        (min.y + max.y) * 0.5f,
        (min.z + max.z) * 0.5f
    )

    fun intersects(other: Aabb): Boolean =
        min.x < other.max.x && max.x > other.min.x &&
        min.y < other.max.y && max.y > other.min.y &&
        min.z < other.max.z && max.z > other.min.z

    fun contains(point: Vec3f): Boolean =
        point.x in min.x..max.x &&
        point.y in min.y..max.y &&
        point.z in min.z..max.z

    fun translated(offset: Vec3f): Aabb = Aabb(min + offset, max + offset)

    fun expanded(amount: Float): Aabb {
        val delta = Vec3f(amount, amount, amount)
        return Aabb(min - delta, max + delta)
    }

    companion object {
        fun fromCenterAndHalfExtents(center: Vec3f, halfExtents: Vec3f): Aabb =
            Aabb(center - halfExtents, center + halfExtents)
    }
}
