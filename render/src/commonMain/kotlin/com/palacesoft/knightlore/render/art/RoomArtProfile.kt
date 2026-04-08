package com.palacesoft.knightlore.render.art

data class RoomArtProfile(
    val roomId: String,
    val anchor: DecorPlacement? = null,
    val decor: List<DecorPlacement> = emptyList(),
    val lightSources: List<LightPlacement> = emptyList(),
    val quietZones: List<GridZone> = emptyList(),
    val notes: String = "",
)

data class DecorPlacement(
    val propKind: PropKind,
    val gridX: Int,
    val gridY: Int,
    val gridZ: Int = 0,
    val scale: Float = 1f,
    val variant: String? = null,
)

enum class LightKind { TORCH, CAULDRON_GLOW, MOONBEAM, DANGER_RED, AMBIENT }

data class LightPlacement(
    val kind: LightKind,
    val gridX: Float,
    val gridY: Float,
    val gridZ: Float,
    val intensity: Float,
    val radius: Float,
)

data class GridZone(val x0: Int, val y0: Int, val x1: Int, val y1: Int)
