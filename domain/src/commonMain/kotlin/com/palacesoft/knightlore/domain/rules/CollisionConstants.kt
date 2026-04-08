package com.palacesoft.knightlore.domain.rules

/** Centralized collision system constants. */
object CollisionConstants {
    /** Player is grounded if z is within this of a surface. */
    const val GROUNDING_EPSILON = 0.01f
    /** Tolerance for findFloorBelow — surfaces slightly above current position still count. */
    const val LANDING_TOLERANCE = 0.1f
    /** Minimum z position (floor level). */
    const val FLOOR_Z = 0f
}
