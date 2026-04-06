package com.palacesoft.knightlore.domain.model

data class CauldronState(
    val requestQueue: List<ItemType>,   // ordered list of 14 items Melkhior wants
    val deliveredCount: Int,            // how many have been delivered so far
    val isComplete: Boolean,
) {
    val currentRequest: ItemType? get() = requestQueue.getOrNull(deliveredCount)
}
