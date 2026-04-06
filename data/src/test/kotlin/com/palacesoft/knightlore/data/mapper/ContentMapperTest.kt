package com.palacesoft.knightlore.data.mapper

import com.palacesoft.knightlore.data.dto.ActorTypeDto
import com.palacesoft.knightlore.data.dto.ItemTypeDto
import com.palacesoft.knightlore.data.dto.ProgressionDto
import com.palacesoft.knightlore.data.dto.RoomDto
import com.palacesoft.knightlore.data.dto.RoomExitDto
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class ContentMapperTest {

    private fun minimalRoom(id: String, exits: List<RoomExitDto> = emptyList(), special: String? = null) = RoomDto(
        id = id,
        width = 5,
        depth = 5,
        height = 3,
        theme = "CASTLE",
        special = special,
        exits = exits,
    )

    private fun minimalProgression(
        startRoomId: String = "room_start",
        cauldronRoomId: String = "room_cauldron",
        sequence: List<String> = listOf("CRYSTAL_BALL", "GOBLET"),
    ) = ProgressionDto(
        totalRequiredItems = 7,
        startRoomId = startRoomId,
        cauldronRoomId = cauldronRoomId,
        cureMode = "MODERN",
        sequence = sequence,
        variableStartIndex = false,
    )

    @Test
    fun `ContentMapper_detectsUnknownRoomReference_throwsException`() {
        val rooms = listOf(
            minimalRoom(
                id = "room_start",
                exits = listOf(
                    RoomExitDto(side = "NORTH", targetRoomId = "room_nonexistent", targetSpawnId = "s1")
                )
            ),
            minimalRoom(id = "room_cauldron"),
        )

        val ex = assertThrows<IllegalArgumentException> {
            ContentMapper.map(
                rooms = rooms,
                items = emptyList(),
                actors = emptyList(),
                progression = minimalProgression(),
            )
        }
        assert(ex.message!!.contains("room_nonexistent"))
        assert(ex.message!!.contains("room_start"))
    }

    @Test
    fun `ContentMapper_mapsAllRooms_returnsCorrectCount`() {
        val rooms = listOf(
            minimalRoom(id = "room_start"),
            minimalRoom(id = "room_cauldron"),
            minimalRoom(id = "room_hall"),
        )

        val result = ContentMapper.map(
            rooms = rooms,
            items = emptyList(),
            actors = emptyList(),
            progression = minimalProgression(),
        )

        assertEquals(3, result.rooms.size)
    }

    @Test
    fun `ContentMapper_sequenceItems_parsedCorrectly`() {
        val rooms = listOf(
            minimalRoom(id = "room_start"),
            minimalRoom(id = "room_cauldron"),
        )
        val sequence = listOf("CRYSTAL_BALL", "GOBLET", "WINE_BOTTLE", "GEM")

        val result = ContentMapper.map(
            rooms = rooms,
            items = emptyList(),
            actors = emptyList(),
            progression = minimalProgression(sequence = sequence),
        )

        assertEquals(4, result.cureSequence.sequence.size)
        assertEquals("CRYSTAL_BALL", result.cureSequence.sequence[0].name)
        assertEquals("GOBLET", result.cureSequence.sequence[1].name)
        assertEquals("WINE_BOTTLE", result.cureSequence.sequence[2].name)
        assertEquals("GEM", result.cureSequence.sequence[3].name)
    }
}
