package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.math.Vec3f
import kotlinx.serialization.Serializable

@Serializable
data class PatrolPoint(val x: Float, val y: Float)

/**
 * Static definition loaded from room JSON `dynamic_objects` array.
 * Converted to [PatrolEnemy] at runtime when the room is entered.
 */
@Serializable
data class PatrolSpawn(
    val id: String,
    val startX: Float,
    val startY: Float,
    val path: List<PatrolPoint>,
    val speed: Float,
)

/**
 * Runtime state of a patrol enemy in the current room.
 * Enemies are re-seeded from [PatrolSpawn] on every room entry.
 */
@Serializable
data class PatrolEnemy(
    val id: String,
    val position: Vec3f,
    val path: List<PatrolPoint>,   // waypoints to loop through
    val speed: Float,              // tiles per second
    val targetIndex: Int = 0,      // which waypoint we're heading toward next
)
