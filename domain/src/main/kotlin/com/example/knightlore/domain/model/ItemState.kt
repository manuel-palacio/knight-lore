package com.example.knightlore.domain.model

import com.example.knightlore.core.ids.ItemId
import com.example.knightlore.core.ids.RoomId
import com.example.knightlore.core.math.Vec3f

enum class ItemType {
    SKULL, CAULDRON_INGREDIENT, KEY, TORCH, SWORD,
    // Generic types for the 14-object cure sequence
    OBJECT_A, OBJECT_B, OBJECT_C, OBJECT_D, OBJECT_E,
    OBJECT_F, OBJECT_G, OBJECT_H, OBJECT_I, OBJECT_J,
}

data class ItemInstance(
    val id: ItemId,
    val type: ItemType,
    val roomId: RoomId?,        // null = carried by player
    val position: Vec3f?,       // null = carried by player
    val carriedByPlayer: Boolean,
)
