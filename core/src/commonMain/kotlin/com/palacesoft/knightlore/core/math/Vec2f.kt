package com.palacesoft.knightlore.core.math

import kotlin.math.sqrt
import kotlinx.serialization.Serializable

@Serializable
data class Vec2f(val x: Float, val y: Float) {

    operator fun plus(other: Vec2f): Vec2f = Vec2f(x + other.x, y + other.y)

    operator fun minus(other: Vec2f): Vec2f = Vec2f(x - other.x, y - other.y)

    operator fun times(scalar: Float): Vec2f = Vec2f(x * scalar, y * scalar)

    operator fun div(scalar: Float): Vec2f = Vec2f(x / scalar, y / scalar)

    operator fun unaryMinus(): Vec2f = Vec2f(-x, -y)

    fun length(): Float = sqrt(x * x + y * y)

    fun normalized(): Vec2f {
        val len = length()
        return if (len < EPSILON) ZERO else Vec2f(x / len, y / len)
    }

    fun dot(other: Vec2f): Float = x * other.x + y * other.y

    companion object {
        val ZERO = Vec2f(0f, 0f)
        val ONE = Vec2f(1f, 1f)
        private const val EPSILON = 1e-6f
    }
}
