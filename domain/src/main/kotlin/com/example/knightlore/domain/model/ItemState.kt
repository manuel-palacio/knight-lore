package com.example.knightlore.domain.model

import com.example.knightlore.core.ids.ItemId
import com.example.knightlore.core.ids.RoomId
import com.example.knightlore.core.math.Vec3f

enum class ItemType {
    SKULL, CAULDRON_INGREDIENT, KEY, TORCH, SWORD,
    // Generic object types, any subset of these can be part of the 14-item cure sequence
    OBJECT_A, OBJECT_B, OBJECT_C, OBJECT_D, OBJECT_E,
    OBJECT_F, OBJECT_G, OBJECT_H, OBJECT_I, OBJECT_J,
}

sealed interface ItemLocation {
    data class InRoom(val roomId: RoomId, val position: Vec3f) : ItemLocation
    data object CarriedByPlayer : ItemLocation
}

data class ItemInstance(
    val id: ItemId,
    val type: ItemType,
    val location: ItemLocation,
)

// Convenience extension properties for backward compatibility
val ItemInstance.isCarried: Boolean get() = location is ItemLocation.CarriedByPlayer
val ItemInstance.roomId: RoomId? get() = (location as? ItemLocation.InRoom)?.roomId
val ItemInstance.position: Vec3f? get() = (location as? ItemLocation.InRoom)?.position
