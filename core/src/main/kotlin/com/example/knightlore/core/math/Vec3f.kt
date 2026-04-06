package com.example.knightlore.core.math

import kotlin.math.sqrt

data class Vec3f(val x: Float, val y: Float, val z: Float) {

    operator fun plus(other: Vec3f): Vec3f = Vec3f(x + other.x, y + other.y, z + other.z)

    operator fun minus(other: Vec3f): Vec3f = Vec3f(x - other.x, y - other.y, z - other.z)

    operator fun times(scalar: Float): Vec3f = Vec3f(x * scalar, y * scalar, z * scalar)

    operator fun unaryMinus(): Vec3f = Vec3f(-x, -y, -z)

    fun length(): Float = sqrt(x * x + y * y + z * z)

    fun normalized(): Vec3f {
        val len = length()
        return if (len == 0f) ZERO else Vec3f(x / len, y / len, z / len)
    }

    fun dot(other: Vec3f): Float = x * other.x + y * other.y + z * other.z

    fun cross(other: Vec3f): Vec3f = Vec3f(
        y * other.z - z * other.y,
        z * other.x - x * other.z,
        x * other.y - y * other.x
    )

    /** Returns a copy of this vector with the Z component replaced. Useful for isometric projection. */
    fun withZ(z: Float): Vec3f = Vec3f(x, y, z)

    companion object {
        val ZERO = Vec3f(0f, 0f, 0f)
        val ONE = Vec3f(1f, 1f, 1f)
        /** Up direction: positive Z axis. */
        val UP = Vec3f(0f, 0f, 1f)
    }
}
