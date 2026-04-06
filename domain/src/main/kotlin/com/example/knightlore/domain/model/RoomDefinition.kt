package com.example.knightlore.domain.model

import com.example.knightlore.core.ids.ItemId
import com.example.knightlore.core.ids.RoomId
import com.example.knightlore.core.math.Vec3f

data class RoomDefinition(
    val id: RoomId,
    val width: Int,       // in tiles
    val depth: Int,       // in tiles
    val height: Int,      // vertical tile layers
    val tiles: List<TileStack>,
    val actors: List<ActorSpawn>,
    val interactives: List<InteractiveDef>,
    val exits: List<RoomExit>,
    val itemAnchors: List<ItemAnchor>,
    val theme: RoomTheme,
    val special: RoomSpecial? = null,
)

data class TileStack(val gridX: Int, val gridY: Int, val gridZ: Int, val type: TileType)

enum class TileType { FLOOR, SOLID_BLOCK, HAZARD, EMPTY }

data class ActorSpawn(val actorType: String, val position: Vec3f)

data class InteractiveDef(val id: String, val position: Vec3f, val kind: InteractiveKind)

enum class InteractiveKind { PUSHABLE_BLOCK, FALLING_BLOCK, MOVING_PLATFORM, SWITCH, GATE }

data class RoomExit(val side: ExitSide, val targetRoomId: RoomId, val targetSpawnId: String)

enum class ExitSide { NORTH, SOUTH, EAST, WEST }

data class ItemAnchor(val itemId: ItemId, val spawnPosition: Vec3f)

enum class RoomTheme { CASTLE, DUNGEON, TOWER }

sealed interface RoomSpecial {
    data object CauldronRoom : RoomSpecial
    data object StartRoom : RoomSpecial
}
