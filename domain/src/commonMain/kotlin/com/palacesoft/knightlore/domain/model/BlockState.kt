package com.palacesoft.knightlore.domain.model

import kotlinx.serialization.Serializable

/**
 * A dynamic block in the room — can be pushed by the player and may fall when stood on.
 *
 * @param fallingTicks  ticks the player has been standing on this block; at 120 the block starts falling
 * @param velocityZ     falling velocity (negative = downward) once the block has started to fall
 */
@Serializable
data class BlockState(
    val id: String,
    val gridX: Int,
    val gridY: Int,
    val gridZ: Int,
    val pushable: Boolean = true,
    val fallingTicks: Int = 0,
    val velocityZ: Float = 0f,
)
