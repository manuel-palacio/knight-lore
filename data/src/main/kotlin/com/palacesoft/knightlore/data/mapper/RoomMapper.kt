package com.palacesoft.knightlore.data.mapper

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.data.dto.RoomDto
import com.palacesoft.knightlore.domain.model.ActorSpawn
import com.palacesoft.knightlore.domain.model.ActorType
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.InteractiveDef
import com.palacesoft.knightlore.domain.model.InteractiveKind
import com.palacesoft.knightlore.domain.model.ItemAnchor
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomExit
import com.palacesoft.knightlore.domain.model.RoomSpecial
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.TileStack
import com.palacesoft.knightlore.domain.model.TileType
import java.util.logging.Logger

object RoomMapper {

    private val logger = Logger.getLogger(RoomMapper::class.java.name)


    fun map(dto: RoomDto): RoomDefinition {
        val roomId = RoomId(dto.id)

        val tiles = dto.tiles.map { tileDto ->
            val type = parseTileType(tileDto.type, dto.id)
            TileStack(gridX = tileDto.x, gridY = tileDto.y, gridZ = tileDto.z, type = type)
        }

        val exits = dto.exits.map { exitDto ->
            val side = ExitSide.valueOf(exitDto.side.uppercase())
            RoomExit(
                side = side,
                targetRoomId = RoomId(exitDto.targetRoomId),
                targetSpawnId = exitDto.targetSpawnId,
            )
        }

        val interactives = dto.interactives.map { interactiveDto ->
            val kind = InteractiveKind.valueOf(interactiveDto.kind.uppercase())
            InteractiveDef(
                id = interactiveDto.id,
                position = Vec3f(interactiveDto.x, interactiveDto.y, interactiveDto.z),
                kind = kind,
            )
        }

        val itemAnchors = dto.itemAnchors.map { anchorDto ->
            ItemAnchor(
                itemId = ItemId(anchorDto.itemId),
                spawnPosition = Vec3f(anchorDto.x, anchorDto.y, anchorDto.z),
            )
        }

        val actorSpawns = dto.actorSpawns.map { spawnDto ->
            val actorType = ActorType.valueOf(spawnDto.actorType.uppercase())
            ActorSpawn(
                actorType = actorType,
                position = Vec3f(spawnDto.x, spawnDto.y, spawnDto.z),
            )
        }

        val theme = parseRoomTheme(dto.theme, dto.id)
        val special = parseRoomSpecial(dto.special)

        return RoomDefinition(
            id = roomId,
            width = dto.width,
            depth = dto.depth,
            height = dto.height,
            tiles = tiles,
            actors = actorSpawns,
            interactives = interactives,
            exits = exits,
            itemAnchors = itemAnchors,
            theme = theme,
            special = special,
        )
    }

    private fun parseTileType(type: String, roomId: String): TileType {
        return try {
            TileType.valueOf(type.uppercase())
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Unknown tile type: $type in room $roomId")
        }
    }

    private fun parseRoomTheme(theme: String, roomId: String): RoomTheme {
        return try {
            RoomTheme.valueOf(theme.uppercase())
        } catch (e: IllegalArgumentException) {
            logger.warning("Unknown theme '$theme' in room '$roomId', falling back to CASTLE")
            RoomTheme.CASTLE
        }
    }

    private fun parseRoomSpecial(special: String?): RoomSpecial? {
        return when (special?.uppercase()) {
            "CAULDRON" -> RoomSpecial.CauldronRoom
            "START" -> RoomSpecial.StartRoom
            null -> null
            else -> null
        }
    }
}
