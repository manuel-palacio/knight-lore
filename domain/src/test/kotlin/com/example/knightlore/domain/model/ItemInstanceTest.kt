package com.example.knightlore.domain.model

import com.example.knightlore.core.ids.ItemId
import com.example.knightlore.core.ids.RoomId
import com.example.knightlore.core.math.Vec3f
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class ItemInstanceTest {

    @Test
    fun itemInstance_inRoom_hasCorrectLocation() {
        val roomId = RoomId("room-1")
        val position = Vec3f(1f, 2f, 0f)
        val item = ItemInstance(
            id = ItemId("item-1"),
            type = ItemType.KEY,
            location = ItemLocation.InRoom(roomId, position),
        )
        val loc = item.location as ItemLocation.InRoom
        assertEquals(roomId, loc.roomId)
        assertEquals(position, loc.position)
    }

    @Test
    fun itemInstance_carried_isCarriedReturnsTrue() {
        val item = ItemInstance(
            id = ItemId("item-2"),
            type = ItemType.CRYSTAL_BALL,
            location = ItemLocation.CarriedByPlayer,
        )
        assertTrue(item.isCarried)
    }

    @Test
    fun itemInstance_inRoom_isCarriedReturnsFalse() {
        val item = ItemInstance(
            id = ItemId("item-3"),
            type = ItemType.TORCH,
            location = ItemLocation.InRoom(RoomId("room-1"), Vec3f.ZERO),
        )
        assertFalse(item.isCarried)
    }
}
