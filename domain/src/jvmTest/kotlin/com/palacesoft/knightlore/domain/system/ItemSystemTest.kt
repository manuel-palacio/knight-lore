package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ItemAnchor
import com.palacesoft.knightlore.domain.model.ItemInstance
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.model.ItemType
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.TransformState
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.rules.RoomProvider
import com.palacesoft.knightlore.domain.testGameState
import com.palacesoft.knightlore.domain.testPlayerState
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class ItemSystemTest {

    private val roomId = RoomId("test-room")
    private val itemId = ItemId("crystal_ball_01")
    private val anchor1 = ItemAnchor(ItemId("anchor_01"), Vec3f(2f, 2f, 1f))
    private val anchor2 = ItemAnchor(ItemId("anchor_02"), Vec3f(5f, 5f, 1f))

    private fun makeRoom(anchors: List<ItemAnchor> = listOf(anchor1, anchor2)): RoomDefinition =
        RoomDefinition(
            id = roomId,
            width = 8,
            depth = 8,
            height = 6,
            tiles = emptyList(),
            actors = emptyList(),
            interactives = emptyList(),
            exits = emptyList(),
            itemAnchors = anchors,
            theme = RoomTheme.CASTLE,
        )

    private fun makeRoomProvider(anchors: List<ItemAnchor> = listOf(anchor1, anchor2)): RoomProvider {
        val room = makeRoom(anchors)
        return object : RoomProvider {
            override fun getRoom(id: RoomId) = if (id == roomId) room else null
        }
    }

    private val system = ItemSystem(makeRoomProvider())

    private fun itemInRoom(pos: Vec3f = Vec3f(1f, 1f, 1f)) = ItemInstance(
        id = itemId,
        type = ItemType.CRYSTAL_BALL,
        location = ItemLocation.InRoom(roomId, pos),
    )

    private fun actionInput() = FrameInput(
        moveVector = com.palacesoft.knightlore.core.math.Vec2f.ZERO,
        jumpPressed = false,
        jumpHeld = false,
        actionPressed = true,
        dropPressed = false,
        cycleInventoryPressed = false,
        pausePressed = false,
    )

    private fun dropInput() = FrameInput(
        moveVector = com.palacesoft.knightlore.core.math.Vec2f.ZERO,
        jumpPressed = false,
        jumpHeld = false,
        actionPressed = false,
        dropPressed = true,
        cycleInventoryPressed = false,
        pausePressed = false,
    )

    @Test
    fun pickup_humanPlayerNearItem_picksUp() {
        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                position = Vec3f(1.2f, 1f, 1f),
                inventory = emptyList(),
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(itemInRoom(Vec3f(1f, 1f, 1f))),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertTrue(result.state.player.inventory.contains(itemId))
        assertTrue(result.events.any { it is GameEvent.ItemPickedUp && it.itemId == itemId })
        val itemLoc = result.state.itemInstances.find { it.id == itemId }?.location
        assertEquals(ItemLocation.CarriedByPlayer, itemLoc)
    }

    @Test
    fun pickup_itemTooFar_doesNotPickUp() {
        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                position = Vec3f(0f, 0f, 1f),
                inventory = emptyList(),
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(itemInRoom(Vec3f(5f, 5f, 1f))),  // distance > 1.5f
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertTrue(result.state.player.inventory.isEmpty())
        assertTrue(result.events.none { it is GameEvent.ItemPickedUp })
    }

    @Test
    fun pickup_inventoryFull_doesNotPickUp() {
        val fullInventory = listOf(ItemId("a"), ItemId("b"), ItemId("c"))
        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                position = Vec3f(1f, 1f, 1f),
                inventory = fullInventory,
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(itemInRoom(Vec3f(1f, 1f, 1f))),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertEquals(3, result.state.player.inventory.size)
        assertTrue(result.events.none { it is GameEvent.ItemPickedUp })
    }

    @Test
    fun pickup_werewulfPlayer_cannotPickUp() {
        val state = testGameState(
            player = testPlayerState(
                form = Form.WEREWULF,
                position = Vec3f(1f, 1f, 1f),
                inventory = emptyList(),
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(itemInRoom(Vec3f(1f, 1f, 1f))),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertTrue(result.state.player.inventory.isEmpty())
        assertTrue(result.events.none { it is GameEvent.ItemPickedUp })
    }

    @Test
    fun pickup_duringTransformation_cannotPickUp() {
        val state = testGameState(
            player = testPlayerState(
                form = Form.HUMAN,
                position = Vec3f(1f, 1f, 1f),
                inventory = emptyList(),
                transformState = TransformState(TransformPhase.TRANSFORMING_TO_WEREWULF, 10),
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(itemInRoom(Vec3f(1f, 1f, 1f))),
        )

        val result = system.update(state, actionInput(), 1f / 60f)

        assertTrue(result.state.player.inventory.isEmpty())
    }

    @Test
    fun drop_snapsToNearestAnchor() {
        val system = ItemSystem(makeRoomProvider(listOf(anchor1, anchor2)))
        val carriedItem = ItemInstance(
            id = itemId,
            type = ItemType.CRYSTAL_BALL,
            location = ItemLocation.CarriedByPlayer,
        )
        val state = testGameState(
            player = testPlayerState(
                position = Vec3f(2.1f, 2f, 1f),  // near anchor1 at (2,2,1)
                inventory = listOf(itemId),
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(carriedItem),
        )

        val result = system.update(state, dropInput(), 1f / 60f)

        assertTrue(result.state.player.inventory.isEmpty())
        val droppedLoc = result.state.itemInstances.find { it.id == itemId }?.location
        assertTrue(droppedLoc is ItemLocation.InRoom)
        val roomLoc = droppedLoc as ItemLocation.InRoom
        assertEquals(anchor1.spawnPosition, roomLoc.position)
        assertTrue(result.events.any { it is GameEvent.ItemDropped && it.itemId == itemId })
    }

    @Test
    fun drop_anchorOccupied_offsetsPosition() {
        val occupyingItem = ItemInstance(
            id = ItemId("other_item"),
            type = ItemType.GOBLET,
            location = ItemLocation.InRoom(roomId, anchor1.spawnPosition),
        )
        val carriedItem = ItemInstance(
            id = itemId,
            type = ItemType.CRYSTAL_BALL,
            location = ItemLocation.CarriedByPlayer,
        )
        val state = testGameState(
            player = testPlayerState(
                position = Vec3f(2f, 2f, 1f),
                inventory = listOf(itemId),
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(occupyingItem, carriedItem),
        )

        val result = system.update(state, dropInput(), 1f / 60f)

        val droppedLoc = result.state.itemInstances.find { it.id == itemId }?.location as? ItemLocation.InRoom
        assertNotNull(droppedLoc)
        // Position should be offset by (0.5f, 0f, 0f)
        assertEquals(anchor1.spawnPosition + Vec3f(0.5f, 0f, 0f), droppedLoc!!.position)
    }

    @Test
    fun drop_noAnchorsInRoom_dropsAtPlayerPosition() {
        val system = ItemSystem(makeRoomProvider(emptyList()))
        val carriedItem = ItemInstance(
            id = itemId,
            type = ItemType.CRYSTAL_BALL,
            location = ItemLocation.CarriedByPlayer,
        )
        val playerPos = Vec3f(3f, 4f, 1f)
        val state = testGameState(
            player = testPlayerState(
                position = playerPos,
                inventory = listOf(itemId),
            ),
        ).copy(
            currentRoomId = roomId,
            itemInstances = listOf(carriedItem),
        )

        val result = system.update(state, dropInput(), 1f / 60f)

        val droppedLoc = result.state.itemInstances.find { it.id == itemId }?.location as? ItemLocation.InRoom
        assertNotNull(droppedLoc)
        assertEquals(Vec3f(playerPos.x, playerPos.y, 1f), droppedLoc!!.position)
    }
}
