package com.example.knightlore.core.math

import kotlin.math.sqrt

/**
 * 8-directional enum for isometric movement.
 *
 * Coordinate convention: X = east, Y = south, Z = up.
 * Diagonal directions are normalized so all directions have unit length.
 *
 * On screen (isometric projection):
 *   NORTH maps to up-left, EAST maps to up-right, SOUTH maps to down-right, WEST maps to down-left.
 */
enum class Direction8 {
    NORTH,
    NORTHEAST,
    EAST,
    SOUTHEAST,
    SOUTH,
    SOUTHWEST,
    WEST,
    NORTHWEST;

    /**
     * Returns the world-space [Vec2f] movement vector for this direction.
     * Cardinal directions have length 1.0; diagonal directions are normalized.
     */
    fun toVector(): Vec2f {
        val diag = (1f / sqrt(2f))
        return when (this) {
            NORTH     -> Vec2f( 0f,     -1f   )
            NORTHEAST -> Vec2f( diag,   -diag )
            EAST      -> Vec2f( 1f,      0f   )
            SOUTHEAST -> Vec2f( diag,    diag )
            SOUTH     -> Vec2f( 0f,      1f   )
            SOUTHWEST -> Vec2f(-diag,    diag )
            WEST      -> Vec2f(-1f,      0f   )
            NORTHWEST -> Vec2f(-diag,   -diag )
        }
    }

    /** Returns the direction rotated 45 degrees clockwise (NORTH → NORTHEAST → EAST → …). */
    fun rotatedCW(): Direction8 {
        val values = entries
        return values[(ordinal + 1) % values.size]
    }

    /** Returns the direction rotated 45 degrees counter-clockwise (NORTH → NORTHWEST → WEST → …). */
    fun rotatedCCW(): Direction8 {
        val values = entries
        return values[(ordinal - 1 + values.size) % values.size]
    }
}
