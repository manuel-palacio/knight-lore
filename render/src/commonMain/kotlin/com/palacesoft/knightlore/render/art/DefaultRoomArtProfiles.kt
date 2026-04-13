package com.palacesoft.knightlore.render.art

/** Room art profiles — kept minimal to avoid visual artifacts. */
object DefaultRoomArtProfiles {
    private val profiles = mapOf<String, RoomArtProfile>(
        // No art profiles needed — rooms 001-005 use clean procedural rendering only.
        // Light overlays, decor, and quiet zones were causing visual bugs (green carpets,
        // orange blobs, floating eyes) and have been removed.
    )

    fun forRoom(roomId: String): RoomArtProfile? = profiles[roomId]
}
