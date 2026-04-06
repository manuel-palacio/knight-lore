package com.palacesoft.knightlore.core.ids

/** Type-safe wrapper for room identifiers. */
@JvmInline
value class RoomId(val value: String) {
    override fun toString(): String = value
}

/** Type-safe wrapper for item identifiers. */
@JvmInline
value class ItemId(val value: String) {
    override fun toString(): String = value
}

/** Type-safe wrapper for actor identifiers. */
@JvmInline
value class ActorId(val value: String) {
    override fun toString(): String = value
}
