package com.palacesoft.knightlore.data.mapper

import com.palacesoft.knightlore.data.dto.ActorSpawnDto
import com.palacesoft.knightlore.data.dto.ItemAnchorDto
import com.palacesoft.knightlore.data.dto.RoomDto
import com.palacesoft.knightlore.data.dto.RoomExitDto
import com.palacesoft.knightlore.data.dto.TileStackDto
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.RoomSpecial
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.TileType
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class RoomMapperTest {

    @Test
    fun `RoomMapper_mapsValidDto_toRoomDefinition`() {
        val dto = RoomDto(
            id = "room_01",
            width = 10,
            depth = 8,
            height = 4,
            theme = "CASTLE",
            special = null,
            tiles = listOf(TileStackDto(x = 0, y = 0, z = 0, type = "FLOOR")),
            exits = listOf(
                RoomExitDto(side = "NORTH", targetRoomId = "room_02", targetSpawnId = "spawn_south")
            ),
            interactives = emptyList(),
            itemAnchors = emptyList(),
            actorSpawns = emptyList(),
        )

        val result = RoomMapper.map(dto)

        assertEquals("room_01", result.id.value)
        assertEquals(10, result.width)
        assertEquals(8, result.depth)
        assertEquals(4, result.height)
        assertEquals(RoomTheme.CASTLE, result.theme)
        assertNull(result.special)

        assertEquals(1, result.tiles.size)
        assertEquals(TileType.FLOOR, result.tiles[0].type)
        assertEquals(0, result.tiles[0].gridX)
        assertEquals(0, result.tiles[0].gridY)
        assertEquals(0, result.tiles[0].gridZ)

        assertEquals(1, result.exits.size)
        assertEquals(ExitSide.NORTH, result.exits[0].side)
        assertEquals("room_02", result.exits[0].targetRoomId.value)
        assertEquals("spawn_south", result.exits[0].targetSpawnId)
    }

    @Test
    fun `RoomMapper_unknownTileType_throwsIllegalArgument`() {
        val dto = RoomDto(
            id = "room_bad",
            width = 5,
            depth = 5,
            height = 3,
            theme = "CASTLE",
            tiles = listOf(TileStackDto(x = 0, y = 0, z = 0, type = "BOGUS_TYPE")),
        )

        val ex = assertThrows<IllegalArgumentException> {
            RoomMapper.map(dto)
        }
        assert(ex.message!!.contains("Unknown tile type: BOGUS_TYPE in room room_bad"))
    }

    @Test
    fun `RoomMapper_cauldronSpecial_mapsToRoomSpecial`() {
        val dto = RoomDto(
            id = "room_cauldron",
            width = 6,
            depth = 6,
            height = 3,
            theme = "DUNGEON",
            special = "CAULDRON",
        )

        val result = RoomMapper.map(dto)

        assertInstanceOf(RoomSpecial.CauldronRoom::class.java, result.special)
    }
}
