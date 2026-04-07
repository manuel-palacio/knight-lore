package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f

enum class RoomType { DUNGEON, CRYPT, CAVERN, FLOODED, THRONE_ANTECHAMBER }

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
    val patrolSpawns: List<PatrolSpawn> = emptyList(),
    val roomType: RoomType = RoomType.DUNGEON,
)

data class TileStack(val gridX: Int, val gridY: Int, val gridZ: Int, val type: TileType)

enum class TileType { FLOOR, SOLID_BLOCK, HAZARD, EMPTY }

data class ActorSpawn(val actorType: ActorType, val position: Vec3f)

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
