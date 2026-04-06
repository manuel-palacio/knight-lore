package com.palacesoft.knightlore.domain

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ActorKind
import com.palacesoft.knightlore.domain.model.ActorTypeDefinition
import com.palacesoft.knightlore.domain.model.CureMode
import com.palacesoft.knightlore.domain.model.CureSequenceDefinition
import com.palacesoft.knightlore.domain.model.EngineConfig
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.ItemAnchor
import com.palacesoft.knightlore.domain.model.ItemType
import com.palacesoft.knightlore.domain.model.ItemTypeDefinition
import com.palacesoft.knightlore.domain.model.ProgressionDefinition
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomSpecial
import com.palacesoft.knightlore.domain.model.RoomTheme
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class DefaultGameEngineTest {

    private val startRoomId = RoomId("room_start")
    private val cauldronRoomId = RoomId("room_cauldron")

    private fun minimalRoom(
        id: RoomId,
        itemAnchors: List<ItemAnchor> = emptyList(),
        special: RoomSpecial? = null,
    ) = RoomDefinition(
        id = id,
        width = 8,
        depth = 8,
        height = 6,
        tiles = emptyList(),
        actors = emptyList(),
        interactives = emptyList(),
        exits = emptyList(),
        itemAnchors = itemAnchors,
        theme = RoomTheme.CASTLE,
        special = special,
    )

    private val cureSequence = listOf(
        ItemType.CRYSTAL_BALL,
        ItemType.GOBLET,
        ItemType.WINE_BOTTLE,
        ItemType.GEM,
        ItemType.CRYSTAL_BALL,
        ItemType.POISON_VIAL,
        ItemType.BOOT,
        ItemType.TEACUP,
        ItemType.GEM,
        ItemType.POISON_VIAL,
        ItemType.BOOT,
        ItemType.GOBLET,
        ItemType.TEACUP,
        ItemType.WINE_BOTTLE,
    )

    private fun buildContent(
        rooms: Map<RoomId, RoomDefinition> = mapOf(
            startRoomId to minimalRoom(startRoomId, special = RoomSpecial.StartRoom),
            cauldronRoomId to minimalRoom(cauldronRoomId, special = RoomSpecial.CauldronRoom),
        ),
        sequence: List<ItemType> = cureSequence,
        itemAnchorsInExtra: List<ItemAnchor> = emptyList(),
    ): GameContent {
        val allRooms = if (itemAnchorsInExtra.isNotEmpty()) {
            rooms + mapOf(
                startRoomId to minimalRoom(startRoomId, itemAnchors = itemAnchorsInExtra, special = RoomSpecial.StartRoom)
            )
        } else {
            rooms
        }
        return GameContent(
            rooms = allRooms,
            itemTypes = mapOf(
                "crystal_ball" to ItemTypeDefinition("crystal_ball", ItemType.CRYSTAL_BALL, "Crystal Ball", true, 1),
                "goblet" to ItemTypeDefinition("goblet", ItemType.GOBLET, "Goblet", true, 1),
                "wine_bottle" to ItemTypeDefinition("wine_bottle", ItemType.WINE_BOTTLE, "Wine Bottle", true, 2),
                "gem" to ItemTypeDefinition("gem", ItemType.GEM, "Gem", true, 2),
                "poison_vial" to ItemTypeDefinition("poison_vial", ItemType.POISON_VIAL, "Poison Vial", true, 2),
                "boot" to ItemTypeDefinition("boot", ItemType.BOOT, "Boot", true, 3),
                "teacup" to ItemTypeDefinition("teacup", ItemType.TEACUP, "Teacup", true, 3),
            ),
            actorTypes = mapOf(
                "guard" to ActorTypeDefinition("guard", ActorKind.GUARD_PATROL, 3f, 1, false),
            ),
            cureSequence = CureSequenceDefinition(
                mode = CureMode.MODERN,
                sequence = sequence,
                variableStartIndex = false,
            ),
            progression = ProgressionDefinition(
                totalRequiredItems = 14,
                startRoomId = startRoomId,
                cauldronRoomId = cauldronRoomId,
            ),
        )
    }

    private val engine = DefaultGameEngine(systems = emptyList())

    @Test
    fun `initialize_setsStartRoomId`() {
        val state = engine.initialize(seed = 42L, content = buildContent())
        assertEquals(startRoomId, state.currentRoomId)
    }

    @Test
    fun `initialize_cauldronHasFirstRequest`() {
        val state = engine.initialize(seed = 42L, content = buildContent())
        val firstExpected = cureSequence.first()
        assertEquals(firstExpected, state.cauldron.currentRequest)
    }

    @Test
    fun `initialize_itemInstancesMatchRoomAnchors`() {
        val anchors = listOf(
            ItemAnchor(ItemId("crystal_ball_01"), Vec3f(2f, 2f, 1f)),
            ItemAnchor(ItemId("goblet_01"), Vec3f(3f, 3f, 1f)),
        )
        val content = buildContent(
            rooms = mapOf(
                startRoomId to minimalRoom(startRoomId, itemAnchors = anchors, special = RoomSpecial.StartRoom),
                cauldronRoomId to minimalRoom(cauldronRoomId),
            )
        )
        val state = engine.initialize(seed = 42L, content = content)
        assertEquals(2, state.itemInstances.size)
    }

    @Test
    fun `initialize_playerHas5Lives`() {
        val state = engine.initialize(seed = 42L, content = buildContent(), config = EngineConfig(playerLives = 5))
        assertEquals(5, state.player.lives)
    }

    @Test
    fun `initialize_playerFormIsHuman`() {
        val state = engine.initialize(seed = 42L, content = buildContent())
        assertEquals(Form.HUMAN, state.player.form)
    }
}
