package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ActorKind
import com.palacesoft.knightlore.domain.model.ActorTypeDefinition
import com.palacesoft.knightlore.domain.model.CauldronState
import com.palacesoft.knightlore.domain.model.CureMode
import com.palacesoft.knightlore.domain.model.CureSequenceDefinition
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.ItemInstance
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.model.ItemType
import com.palacesoft.knightlore.domain.model.ProgressionDefinition
import com.palacesoft.knightlore.domain.testGameState
import com.palacesoft.knightlore.domain.testPlayerState
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class CauldronSystemTest {

    private val cauldronRoomId = RoomId("cauldron-room")
    private val otherRoomId = RoomId("other-room")

    private fun makeContent(mode: CureMode = CureMode.CLASSIC): GameContent = GameContent(
        rooms = emptyMap(),
        itemTypes = emptyMap(),
        actorTypes = mapOf(
            "guard" to ActorTypeDefinition("guard", ActorKind.GUARD_PATROL, 3f, 1, false),
        ),
        cureSequence = CureSequenceDefinition(
            mode = mode,
            sequence = listOf(ItemType.CRYSTAL_BALL, ItemType.GOBLET),
            variableStartIndex = false,
        ),
        progression = ProgressionDefinition(
            totalRequiredItems = 2,
            startRoomId = otherRoomId,
            cauldronRoomId = cauldronRoomId,
        ),
    )

    private val crystalBallId = ItemId("crystal_ball_01")
    private val gobletId = ItemId("goblet_01")
    private val wrongItemId = ItemId("boot_01")

    private fun makeCarriedItem(id: ItemId, type: ItemType) = ItemInstance(
        id = id,
        type = type,
        location = ItemLocation.CarriedByPlayer,
    )

    private fun actionInput() = FrameInput(
        moveVector = Vec2f.ZERO,
        jumpPressed = false,
        jumpHeld = false,
        actionPressed = true,
        dropPressed = false,
        cycleInventoryPressed = false,
        pausePressed = false,
    )

    @Test
    fun delivery_correctItem_advancesCauldron() {
        val content = makeContent(CureMode.CLASSIC)
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                inventory = listOf(crystalBallId),
            ),
        ).copy(
            currentRoomId = cauldronRoomId,
            cauldron = CauldronState(
                requestQueue = listOf(ItemType.CRYSTAL_BALL, ItemType.GOBLET),
                deliveredCount = 0,
                isComplete = false,
            ),
            itemInstances = listOf(makeCarriedItem(crystalBallId, ItemType.CRYSTAL_BALL)),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertEquals(1, result.state.cauldron.deliveredCount)
        assertTrue(result.state.player.inventory.isEmpty())
        assertTrue(result.events.any { it is GameEvent.CauldronRequestAdvanced })
        assertTrue(result.events.none { it is GameEvent.QuestCompleted })
    }

    @Test
    fun delivery_lastItem_emitsQuestCompleted() {
        val content = makeContent(CureMode.CLASSIC)
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                inventory = listOf(gobletId),
            ),
        ).copy(
            currentRoomId = cauldronRoomId,
            cauldron = CauldronState(
                requestQueue = listOf(ItemType.CRYSTAL_BALL, ItemType.GOBLET),
                deliveredCount = 1,  // crystal ball already delivered
                isComplete = false,
            ),
            itemInstances = listOf(makeCarriedItem(gobletId, ItemType.GOBLET)),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertEquals(2, result.state.cauldron.deliveredCount)
        assertTrue(result.state.cauldron.isComplete)
        assertTrue(result.events.any { it is GameEvent.QuestCompleted })
    }

    @Test
    fun delivery_wrongItem_classic_dropsAllItems() {
        val content = makeContent(CureMode.CLASSIC)
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                inventory = listOf(wrongItemId),
                position = Vec3f(3f, 3f, 1f),
            ),
        ).copy(
            currentRoomId = cauldronRoomId,
            cauldron = CauldronState(
                requestQueue = listOf(ItemType.CRYSTAL_BALL, ItemType.GOBLET),
                deliveredCount = 0,
                isComplete = false,
            ),
            itemInstances = listOf(makeCarriedItem(wrongItemId, ItemType.BOOT)),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        // Cauldron count should NOT advance
        assertEquals(0, result.state.cauldron.deliveredCount)
        // All items dropped
        assertTrue(result.state.player.inventory.isEmpty())
        assertTrue(result.events.any { it is GameEvent.ItemDropped })
        assertTrue(result.events.none { it is GameEvent.CauldronRequestAdvanced })
    }

    @Test
    fun delivery_wrongItem_modern_doesNothing() {
        val content = makeContent(CureMode.MODERN)
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                inventory = listOf(wrongItemId),
            ),
        ).copy(
            currentRoomId = cauldronRoomId,
            cauldron = CauldronState(
                requestQueue = listOf(ItemType.CRYSTAL_BALL, ItemType.GOBLET),
                deliveredCount = 0,
                isComplete = false,
            ),
            itemInstances = listOf(makeCarriedItem(wrongItemId, ItemType.BOOT)),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        // Nothing happens in MODERN mode
        assertEquals(0, result.state.cauldron.deliveredCount)
        assertEquals(listOf(wrongItemId), result.state.player.inventory)
        assertTrue(result.events.none { it is GameEvent.ItemDropped })
    }

    @Test
    fun werewulf_inCauldronRoom_takesDamage() {
        val content = makeContent()
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.WEREWULF,
                lives = 3,
                damageCooldownTicks = 0,
            ),
        ).copy(currentRoomId = cauldronRoomId)

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)

        assertEquals(2, result.state.player.lives)
        assertTrue(result.events.any { it == GameEvent.PlayerDamaged })
    }

    @Test
    fun werewulf_inCauldronRoom_zeroLives_emitsGameOver() {
        val content = makeContent()
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.WEREWULF,
                lives = 1,
                damageCooldownTicks = 0,
            ),
        ).copy(currentRoomId = cauldronRoomId)

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)

        assertEquals(0, result.state.player.lives)
        assertTrue(result.events.any { it == GameEvent.GameOver })
    }

    @Test
    fun noAction_doesNotDeliver() {
        val content = makeContent()
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                inventory = listOf(crystalBallId),
            ),
        ).copy(
            currentRoomId = cauldronRoomId,
            cauldron = CauldronState(
                requestQueue = listOf(ItemType.CRYSTAL_BALL),
                deliveredCount = 0,
                isComplete = false,
            ),
            itemInstances = listOf(makeCarriedItem(crystalBallId, ItemType.CRYSTAL_BALL)),
        )

        val result = system.update(state, FrameInput.IDLE, 1f / 60f)

        // No delivery without actionPressed
        assertEquals(0, result.state.cauldron.deliveredCount)
    }

    @Test
    fun notInCauldronRoom_doesNothing() {
        val content = makeContent()
        val system = CauldronSystem(content)

        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                inventory = listOf(crystalBallId),
            ),
        ).copy(
            currentRoomId = otherRoomId,
            cauldron = CauldronState(
                requestQueue = listOf(ItemType.CRYSTAL_BALL),
                deliveredCount = 0,
                isComplete = false,
            ),
            itemInstances = listOf(makeCarriedItem(crystalBallId, ItemType.CRYSTAL_BALL)),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertEquals(0, result.state.cauldron.deliveredCount)
    }
}
