package com.palacesoft.knightlore.core.ids

import kotlinx.serialization.Serializable

/** Type-safe wrapper for room identifiers. */
@Serializable
@JvmInline
value class RoomId(val value: String) {
    override fun toString(): String = value
}

/** Type-safe wrapper for item identifiers. */
@Serializable
@JvmInline
value class ItemId(val value: String) {
    override fun toString(): String = value
}

/** Type-safe wrapper for actor identifiers. */
@Serializable
@JvmInline
value class ActorId(val value: String) {
    override fun toString(): String = value
}
