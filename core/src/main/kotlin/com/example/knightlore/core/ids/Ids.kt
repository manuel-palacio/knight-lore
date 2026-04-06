package com.example.knightlore.core.ids

/** Type-safe wrapper for room identifiers. */
@JvmInline
value class RoomId(val value: String)

/** Type-safe wrapper for item identifiers. */
@JvmInline
value class ItemId(val value: String)

/** Type-safe wrapper for actor identifiers. */
@JvmInline
value class ActorId(val value: String)
