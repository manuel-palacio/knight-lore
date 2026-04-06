package com.palacesoft.knightlore.data.mapper

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.data.dto.ActorTypeDto
import com.palacesoft.knightlore.data.dto.ItemTypeDto
import com.palacesoft.knightlore.data.dto.ProgressionDto
import com.palacesoft.knightlore.data.dto.RoomDto
import com.palacesoft.knightlore.domain.model.ActorKind
import com.palacesoft.knightlore.domain.model.ActorTypeDefinition
import com.palacesoft.knightlore.domain.model.CureMode
import com.palacesoft.knightlore.domain.model.CureSequenceDefinition
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.ItemType
import com.palacesoft.knightlore.domain.model.ItemTypeDefinition
import com.palacesoft.knightlore.domain.model.ProgressionDefinition

object ContentMapper {

    fun map(
        rooms: List<RoomDto>,
        items: List<ItemTypeDto>,
        actors: List<ActorTypeDto>,
        progression: ProgressionDto,
    ): GameContent {
        val mappedRooms = rooms.associate { roomDto ->
            RoomId(roomDto.id) to RoomMapper.map(roomDto)
        }

        // Validate room exit references
        for (room in rooms) {
            for (exit in room.exits) {
                if (RoomId(exit.targetRoomId) !in mappedRooms) {
                    throw IllegalArgumentException(
                        "Room exit references unknown room '${exit.targetRoomId}' in room '${room.id}'"
                    )
                }
            }
        }

        // Validate progression room IDs
        val startRoomId = RoomId(progression.startRoomId)
        val cauldronRoomId = RoomId(progression.cauldronRoomId)

        require(startRoomId in mappedRooms) {
            "Progression startRoomId '${progression.startRoomId}' not found in mapped rooms"
        }
        require(cauldronRoomId in mappedRooms) {
            "Progression cauldronRoomId '${progression.cauldronRoomId}' not found in mapped rooms"
        }

        // Validate and parse cure sequence item types
        val sequence = progression.sequence.map { itemTypeName ->
            try {
                ItemType.valueOf(itemTypeName.uppercase())
            } catch (e: IllegalArgumentException) {
                throw IllegalArgumentException(
                    "Unknown ItemType in progression sequence: '$itemTypeName'"
                )
            }
        }

        val mappedItems = items.associate { dto ->
            val family = ItemType.valueOf(dto.family.uppercase())
            dto.id to ItemTypeDefinition(
                id = dto.id,
                family = family,
                displayName = dto.displayName,
                isCureRelevant = dto.isCureRelevant,
                tier = dto.tier,
            )
        }

        val mappedActors = actors.associate { dto ->
            val kind = ActorKind.valueOf(dto.kind.uppercase())
            dto.id to ActorTypeDefinition(
                id = dto.id,
                kind = kind,
                patrolRadius = dto.patrolRadius,
                contactDamage = dto.contactDamage,
                formReactive = dto.formReactive,
            )
        }

        val cureMode = CureMode.valueOf(progression.cureMode.uppercase())

        return GameContent(
            rooms = mappedRooms,
            itemTypes = mappedItems,
            actorTypes = mappedActors,
            cureSequence = CureSequenceDefinition(
                mode = cureMode,
                sequence = sequence,
                variableStartIndex = progression.variableStartIndex,
            ),
            progression = ProgressionDefinition(
                totalRequiredItems = progression.totalRequiredItems,
                startRoomId = startRoomId,
                cauldronRoomId = cauldronRoomId,
            ),
        )
    }
}
