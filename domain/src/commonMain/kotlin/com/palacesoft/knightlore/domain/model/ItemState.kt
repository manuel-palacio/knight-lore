package com.palacesoft.knightlore.domain.model

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec3f

enum class ItemType {
    // The 14-step cure sequence items (canonical Knight Lore names)
    CRYSTAL_BALL,
    GOBLET,
    WINE_BOTTLE,
    GEM,
    POISON_VIAL,
    BOOT,
    TEACUP,
    // Structural items
    KEY,
    TORCH,
    SKULL,
    // Additional room objects
    CAULDRON_INGREDIENT,
    ORNAMENT,
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
