package com.palacesoft.knightlore.render.art

/** Room art profiles for hero rooms. Returns null for rooms without authored profiles. */
object DefaultRoomArtProfiles {
    private val profiles = mapOf(
        "room_001" to RoomArtProfile(
            roomId = "room_001",
            anchor = DecorPlacement(PropKind.CAULDRON, 4, 3, 1, scale = 1.25f, variant = "chained"),
            lightSources = listOf(LightPlacement(LightKind.CAULDRON_GLOW, 4.5f, 3.5f, 1f, 0.8f, 3.5f)),
            quietZones = listOf(GridZone(0, 5, 2, 7)),
            notes = "Cauldron Hall — cursed cauldron anchor, green underglow, dark rear corner",
        ),
        "room_002" to RoomArtProfile(
            roomId = "room_002",
            lightSources = listOf(LightPlacement(LightKind.TORCH, 4f, 0.5f, 1.5f, 0.6f, 2.5f)),
            quietZones = listOf(GridZone(5, 5, 7, 7)),
            notes = "Start room — introductory, directional flow toward south exit",
        ),
        "room_003" to RoomArtProfile(
            roomId = "room_003",
            decor = listOf(DecorPlacement(PropKind.CHAIN_CLUSTER, 1, 0, 2)),
            lightSources = listOf(
                LightPlacement(LightKind.TORCH, 2f, 0.5f, 1.5f, 0.7f, 2.5f),
                LightPlacement(LightKind.TORCH, 6f, 0.5f, 1.5f, 0.7f, 2.5f),
            ),
            notes = "Puzzle room — dual torch lighting, chain detail",
        ),
        "room_007" to RoomArtProfile(
            roomId = "room_007",
            lightSources = listOf(LightPlacement(LightKind.DANGER_RED, 3.5f, 5f, 0f, 0.5f, 2f)),
            quietZones = listOf(GridZone(0, 0, 3, 2)),
            notes = "Falling block trap — red danger lighting over hazard, sparse upper area",
        ),
        "room_015" to RoomArtProfile(
            roomId = "room_015",
            decor = listOf(
                DecorPlacement(PropKind.BANNER, 7, 0, 2, variant = "torn"),
                DecorPlacement(PropKind.CHAIN_CLUSTER, 0, 3, 2),
            ),
            lightSources = listOf(
                LightPlacement(LightKind.TORCH, 2f, 0.5f, 1.5f, 0.6f, 2f),
                LightPlacement(LightKind.TORCH, 6f, 0.5f, 1.5f, 0.6f, 2f),
            ),
            notes = "Multi-enemy combat room — two torches, torn banner, chains",
        ),
    )

    fun forRoom(roomId: String): RoomArtProfile? = profiles[roomId]
}
